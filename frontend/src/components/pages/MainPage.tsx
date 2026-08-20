import Chat from "../main/content/Chat";
import NavBar from "../main/NavBar";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Profile from "../main/content/Profile";
import Statistics from "../main/Statistics";
import StravaPage from "../main/StravaPage";
import OCRPage from "../main/OCRPage";
import IntervalPlanDetailsPage from "./IntervalPlanDetailsPage";
import ActivitiesPage from "../main/ActivitiesPage";

const MAIN_PAGE_TABS = [
  "Chat AI",
  "Statistics",
  "Strava",
  "Activities",
  "OCR",
  "Profile",
] as const;

const isMainPageTab = (value: string | null): value is (typeof MAIN_PAGE_TABS)[number] => {
  return value !== null && MAIN_PAGE_TABS.includes(value as (typeof MAIN_PAGE_TABS)[number]);
};

const MainPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get("tab");
  const [activeComponent, setActiveComponent] = useState(isMainPageTab(initialTab) ? initialTab : "Chat AI");
  const [isNavBarExpanded, setIsNavBarExpanded] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (isMainPageTab(tabFromUrl) && tabFromUrl !== activeComponent) {
      setActiveComponent(tabFromUrl);
    }
  }, [activeComponent, searchParams]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleOptionClick = (option: string) => {
    if (isMainPageTab(option)) {
      setActiveComponent(option);
      navigate(`/main?tab=${encodeURIComponent(option)}`);
    }
  };

  const isIntervalPlanDetailsView = location.pathname.startsWith("/main/interval-plans/");

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case "Chat AI":
        return <Chat />;
      case "Statistics":
        return <Statistics />;
      case "Strava":
        return <StravaPage />;
      case "Activities":
        return <ActivitiesPage />;
      case "OCR":
        return <OCRPage />;
      case "Profile":
        return <Profile />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-first flex items-center justify-center overflow-x-hidden">
      {/* User info + Logout button - top right corner */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
        >
          Logout
        </Button>
      </div>

      <NavBar
        onOptionClick={handleOptionClick}
        onExpandChange={setIsNavBarExpanded}
      />
      <div
        className={`self-start mt-8 h-11/12 transition-all duration-300 ${
          isNavBarExpanded ? "w-4/5 ml-48" : "w-5/6 ml-14"
        }`}
      >
        {isIntervalPlanDetailsView ? <IntervalPlanDetailsPage /> : renderActiveComponent()}
      </div>
    </div>
  );
};

export default MainPage;
