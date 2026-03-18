import NewsSection        from "@/components/NewsSection";
import HistoryCard        from "@/components/HistoryCard";
import FactCard           from "@/components/FactCard";
import WikiDiscover       from "@/components/WikiDiscover";
import HabitTracker       from "@/components/HabitTracker";
import CalendarSection, { HabitActivitySection } from "@/components/CalendarSection";
import SettingsModal      from "@/components/SettingsModal";
import SleepTracker       from "@/components/SleepTracker";
import DashboardHeader    from "@/components/DashboardHeader";
import AccountButton      from "@/components/AccountButton";
import JournalSection     from "@/components/JournalSection";
import CountdownSection   from "@/components/CountdownSection";
import WeekSummary        from "@/components/WeekSummary";
import DraggableDashboard, { DashboardProvider } from "@/components/DraggableDashboard";

export default function Home() {
  return (
    <DashboardProvider>
      <main className="min-h-screen px-4 py-10 sm:px-8 md:py-14 max-w-5xl mx-auto">
        <SettingsModal />
        <AccountButton />
        <DashboardHeader />

        <DraggableDashboard>
          {/* news */}
          <div data-section="news" className="grid grid-cols-1">
            <NewsSection />
          </div>

          {/* history-fact: On This Day | Did You Know + Discover */}
          <div data-section="history-fact" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <HistoryCard />
            <div className="flex flex-col gap-5">
              <FactCard />
              <WikiDiscover />
            </div>
          </div>

          {/* habits-sleep */}
          <div data-section="habits-sleep" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <HabitTracker />
            <SleepTracker />
          </div>

          {/* journal: Journal | Week Summary + Countdown stacked */}
          <div data-section="journal" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <JournalSection />
            <div className="flex flex-col gap-5 h-full">
              <WeekSummary />
              <div className="flex-1 min-h-0">
                <CountdownSection />
              </div>
            </div>
          </div>

          {/* heatmap */}
          <div data-section="heatmap" className="grid grid-cols-1">
            <HabitActivitySection />
          </div>

          {/* calendar */}
          <div data-section="calendar" className="grid grid-cols-1">
            <CalendarSection />
          </div>
        </DraggableDashboard>
      </main>
    </DashboardProvider>
  );
}
