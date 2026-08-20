import NavBarOption from "./NavBarOption";
import { FaComment } from "react-icons/fa";
import { FaChevronRight } from "react-icons/fa";
import { useState } from "react";
import { FaRegUserCircle } from "react-icons/fa";
import { FaChartLine } from "react-icons/fa6";
import { useAuth } from "@/contexts/AuthContext";
import { FaStrava } from "react-icons/fa6";
import { FaFilePdf } from "react-icons/fa6";
import { FaRegBookmark } from "react-icons/fa";

interface NavBarProps {
  onOptionClick?: (option: string) => void;
  onExpandChange?: (expanded: boolean) => void;
}

const MainLayout = ({ onOptionClick, onExpandChange }: NavBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onExpandChange) {
      onExpandChange(newExpanded);
    }
  };

  const handleOptionClick = (label: string) => {
    if (onOptionClick) {
      onOptionClick(label);
    }
  };

  return (
    <div
      className={`fixed ${
        isExpanded ? "bg-first w-48" : "bg-first w-14"
      } h-screen flex left-0 top-0 items-center flex-col transition-all duration-300 z-50`}
    >
      <NavBarOption
        icon={<FaComment />}
        onClick={() => handleOptionClick("Chat AI")}
        label="Chat AI"
        isExpanded={isExpanded}
      />
      <NavBarOption
        icon={<FaChartLine />}
        onClick={() => handleOptionClick("Statistics")}
        label="Statistics"
        isExpanded={isExpanded}
      />
      <NavBarOption
        icon={<FaStrava />}
        onClick={() => handleOptionClick("Strava")}
        label="Strava"
        isExpanded={isExpanded}
      />
      <NavBarOption
        icon={<FaRegBookmark />}
        onClick={() => handleOptionClick("Activities")}
        label="Activities"
        isExpanded={isExpanded}
      />
      <NavBarOption
        icon={<FaFilePdf />}
        onClick={() => handleOptionClick("OCR")}
        label="OCR"
        isExpanded={isExpanded}
      />
      <div
        className={`absolute bottom-4 h-12 bg-second rounded-full flex items-center justify-center hover:bg-third cursor-pointer ${
          isExpanded ? "w-44 px-3 justify-center" : "w-12 justify-center"
        }`}
        onClick={() => handleOptionClick("Profile")}
      >
        <FaRegUserCircle className="text-2xl" />
        {isExpanded && <span className="pl-2">{user?.username}</span>}
      </div>
      <div
        onClick={handleToggle}
        className="absolute bottom-18 right-0 w-8 h-8 bg-second rounded-full translate-x-4 flex items-center justify-center hover:bg-third cursor-pointer"
      >
        <FaChevronRight
          className={`transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>
    </div>
  );
};

export default MainLayout;
