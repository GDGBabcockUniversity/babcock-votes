"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Users, CalendarCheck, BarChart3 } from "lucide-react";
import { getDepartmentName } from "@/lib/utils";

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  const statsData = useQuery(api.admin.dashboardStats);
  const loading = statsData === undefined;
  const stats = statsData ?? {
    totalElections: 0,
    activeElections: 0,
    totalVotes: 0,
    totalVotesCapped: false,
    totalUsers: 0,
    totalUsersCapped: false,
  };

  // A capped count means the real figure is higher than we were willing to scan.
  const fmt = (value: number, capped?: boolean) =>
    `${value.toLocaleString()}${capped ? "+" : ""}`;

  const cards = [
    {
      title: "Total Elections",
      value: fmt(stats.totalElections),
      icon: CalendarCheck,
    },
    { title: "Active Now", value: fmt(stats.activeElections), icon: BarChart3 },
    ...(isSuperAdmin
      ? [
          {
            title: "Votes Cast",
            value: fmt(stats.totalVotes, stats.totalVotesCapped),
            icon: Vote,
          },
        ]
      : []),
    {
      title: "Registered Voters",
      value: fmt(stats.totalUsers, stats.totalUsersCapped),
      icon: Users,
    },
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

      <div
        className={`mt-6 grid gap-4 sm:grid-cols-2 ${
          isSuperAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {cards.map((card) => (
          <Card key={card.title} className="rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider font-sans text-muted-gray">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-gold-ink" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded-sm bg-secondary" />
              ) : (
                <p className="font-sans text-2xl font-bold tabular-nums md:text-3xl">
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
