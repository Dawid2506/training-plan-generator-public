import React from "react";

interface NavBarOptionProps {
  icon: React.ReactNode;
  onClick?: () => void;
  label?: string;
  isExpanded?: boolean;
}

const NavBarOption: React.FC<NavBarOptionProps> = ({
  icon,
  onClick,
  label,
  isExpanded = false,
}) => {
  return (
    <div
      className={`mt-2 h-12 flex items-center text-white hover:bg-third bg-background transition-all duration-200 rounded-xs cursor-pointer ${
        isExpanded ? "w-44 px-3 justify-start" : "w-12 justify-center"
      }`}
      onClick={onClick}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      {isExpanded && label && (
        <span className="ml-3 text-sm font-medium animate-in fade-in duration-300 delay-100">
          {label}
        </span>
      )}
    </div>
  );
};

export default NavBarOption;
