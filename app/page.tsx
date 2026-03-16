import NewsSection from "@/components/NewsSection";
import HistoryCard from "@/components/HistoryCard";
import FactCard from "@/components/FactCard";
import HabitTracker from "@/components/HabitTracker";
import CalendarSection from "@/components/CalendarSection";
import SettingsModal from "@/components/SettingsModal";
import SleepTracker from "@/components/SleepTracker";
import DashboardHeader from "@/components/DashboardHeader";
import AccountButton from "@/components/AccountButton";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 md:py-14 max-w-5xl mx-auto">
      <SettingsModal />
      <AccountButton />
      <DashboardHeader />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* News — full width */}
        <div className="md:col-span-2">
          <NewsSection />
        </div>

        {/* History and Fact — side by side */}
        <HistoryCard />
        <FactCard />

        {/* Habit tracker + Sleep tracker — side by side */}
        <HabitTracker />
        <SleepTracker />

        {/* Calendar — full width */}
        <div className="md:col-span-2">
          <CalendarSection />
        </div>

      </div>
    </main>
  );
}
