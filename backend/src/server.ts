import app from "./app";
import { createInitialSuperAdmin } from "./utils/setup";

const PORT = process.env.PORT || 3000;

createInitialSuperAdmin().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
