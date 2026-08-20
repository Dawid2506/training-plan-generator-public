import React from "react";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import {
  FaCircleExclamation,
  FaCheck,
  FaCircleInfo,
  FaTriangleExclamation,
} from "react-icons/fa6";

const icon = {
  Success: <FaCheck className="text-green-500" />,
  Error: <FaCircleExclamation className="text-red-500" />,
  Info: <FaCircleInfo className="text-blue-500" />,
  Warning: <FaTriangleExclamation className="text-yellow-500" />,
};

const variant: Record<"Success" | "Error" | "Info" | "Warning", "success" | "destructive" | "info" | "warning"> = {
  Success: "success",
  Error: "destructive",
  Info: "info",
  Warning: "warning",
};

interface NotificationProps {
  message: string;
  type?: "Success" | "Error" | "Info" | "Warning";
}

const Notifications: React.FC<NotificationProps> = ({
  message,
  type = "Error",
}) => {
  return (
    <div className="min-w-42 flex flex-col gap-y-2 space-y-2 justify-center p-4 z-50">
      <Alert variant={variant[type]}>
        {icon[type]}
        <AlertTitle>{type}</AlertTitle>
        <AlertDescription>
          {message || "No additional information provided."}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Notifications;
