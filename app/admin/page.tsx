"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Users, CalendarCheck, BarChart3 } from "lucide-react";
import { getDepartmentName } from "@/lib/utils";

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalVotes: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const electionsSnap = await getDocs(collection(db, "elections"));
      const allElections = electionsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const scoped = isSuperAdmin
        ? allElections
        : allElections.filter(
            (e) =>
              (e as { departmentId?: string }).departmentId ===
              userProfile?.departmentId,
          );

      const activeCount = scoped.filter(
        (e) => (e as { status?: string }).status === "active",
      ).length;

      const votesSnap = await getDocs(collection(db, "votes"));

      let usersCount = 0;
      if (isSuperAdmin) {
        const usersSnap = await getDocs(collection(db, "users"));
        usersCount = usersSnap.size;
      } else {
        const usersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("departmentId", "==", userProfile?.departmentId),
          ),
        );
        usersCount = usersSnap.size;
      }

      setStats({
        totalElections: scoped.length,
        activeElections: activeCount,
        totalVotes: votesSnap.size,
        totalUsers: usersCount,
      });
      setLoading(false);
    };
    fetchStats();
  }, [isSuperAdmin, userProfile?.departmentId]);

  const cards = [
    {
      title: "Total Elections",
      value: stats.totalElections,
      icon: CalendarCheck,
    },
    { title: "Active Now", value: stats.activeElections, icon: BarChart3 },
    { title: "Votes Cast", value: stats.totalVotes, icon: Vote },
    { title: "Registered Voters", value: stats.totalUsers, icon: Users },
  ];

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
          Dashboard
        </h1>
        <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
          {isSuperAdmin
            ? "Overview of all elections across departments."
            : `Elections for ${getDepartmentName(userProfile?.departmentId || "")}.`}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider font-sans text-muted-gray">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-gold" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-secondary" />
              ) : (
                <p className="text-2xl md:text-3xl font-sans font-bold">
                  {card.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
