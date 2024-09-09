import Role from "../models/roleModel.js";
import User from "../models/userModal.js";

const initDB = async () => {
  try {
    // Check if admin role exists
    let adminRole = await Role.findOne({ name: "admin" });

    if (!adminRole) {
      // Create admin role if it doesn't exist
      adminRole = new Role({
        name: "admin",
        description: "Administrator with full access",
      });
      adminRole = await adminRole.save();
      console.log("Admin role created");
    }

    // Check if admin user exists
    const adminUser = await User.findOne({ email: "admin@gmail.com" });

    if (!adminUser) {
      // Create admin user if it doesn't exist
      const newAdminUser = new User({
        email: "admin@gmail.com",
        password: "123", // Change this to a secure password
        role: adminRole._id,
        isApproved: true,
      });
      await newAdminUser.save();
      console.log("Admin user created");
    }

    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

export default initDB;
