import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { FaUser } from "react-icons/fa6";

const Profile = () => {
  const { user } = useAuth();
  return (
    <div className="h-full w-full text-white">
      <Card className="h-1/4 w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <p>
              <FaUser />
            </p>
            <CardTitle>{user?.username}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <p>Email: {user?.email}</p>
            <p>User role: {user?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
