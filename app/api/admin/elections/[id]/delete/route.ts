import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";

const CHUNK_SIZE = 250;

const deleteCollectionRecursively = async (
  collectionPath: string,
): Promise<void> => {
  while (true) {
    const snapshot = await adminDb
      .collection(collectionPath)
      .orderBy(FieldPath.documentId())
      .limit(CHUNK_SIZE)
      .get();

    if (snapshot.empty) break;

    for (const document of snapshot.docs) {
      const nestedCollections = await document.ref.listCollections();
      for (const nested of nestedCollections) {
        await deleteCollectionRecursively(nested.path);
      }
      await document.ref.delete();
    }
  }
};

const deleteVotesForElection = async (electionId: string) => {
  while (true) {
    const votes = await adminDb
      .collection("votes")
      .where("electionId", "==", electionId)
      .limit(CHUNK_SIZE)
      .get();

    if (votes.empty) break;

    const batch = adminDb.batch();
    for (const voteDoc of votes.docs) {
      batch.delete(voteDoc.ref);
    }
    await batch.commit();
  }
};

const getBearerToken = (request: NextRequest) => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7);
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Missing auth token." },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const role = userSnap.data()?.role;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;
    const electionRef = adminDb.collection("elections").doc(id);
    const electionSnap = await electionRef.get();
    if (!electionSnap.exists) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 },
      );
    }

    const childCollections = await electionRef.listCollections();
    for (const child of childCollections) {
      await deleteCollectionRecursively(child.path);
    }

    await deleteVotesForElection(id);
    await adminDb.collection("election_analytics").doc(id).delete();
    await adminStorage
      .bucket()
      .deleteFiles({ prefix: `candidates/${id}/`, force: true });

    await electionRef.delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[delete-election] Failed to delete election:", error);
    return NextResponse.json(
      { error: "Failed to delete election." },
      { status: 500 },
    );
  }
}
