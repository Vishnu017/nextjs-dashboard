import bcrypt from "bcrypt";
import { Client, Pool } from "pg";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

// Environment variables
const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE } =
  process.env;

const pgClient = new Client({
  host: "localhost",
  user: "user",
  port: 5432, // Ensure this is the correct port
  password: "password",
  database: "dashboardDB",
  ssl: false,
  connectionTimeoutMillis: 20000, // Set a timeout for connection attempts
});

async function connectClient() {
  try {
    await pgClient.connect();
    console.log("Connection successful!");
  } catch (err) {
    console.error("Connection error:", err);
    throw err;
  }
}

async function disconnectClient() {
  try {
    await pgClient.end();
    console.log("Connection closed.");
  } catch (err) {
    console.error("Error closing connection:", err);
  }
}

async function seedUsers() {
  await pgClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await pgClient.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );`);

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await pgClient.query(
        `
      INSERT INTO users (id, name, email, password)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `,
        [user.id, user.name, user.email, hashedPassword],
      );
    }),
  );
}

async function seedInvoices() {
  await pgClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await pgClient.query(`CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID NOT NULL,
    amount INT NOT NULL,
    status VARCHAR(255) NOT NULL,
    date DATE NOT NULL
  );`);

  await Promise.all(
    invoices.map((invoice) =>
      pgClient.query(
        `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `,
        [invoice.customer_id, invoice.amount, invoice.status, invoice.date],
      ),
    ),
  );
}

async function seedCustomers() {
  await pgClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await pgClient.query(`CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    image_url VARCHAR(255) NOT NULL
  );`);

  await Promise.all(
    customers.map((customer) =>
      pgClient.query(
        `
      INSERT INTO customers (id, name, email, image_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `,
        [customer.id, customer.name, customer.email, customer.image_url],
      ),
    ),
  );
}

async function seedRevenue() {
  await pgClient.query(`CREATE TABLE IF NOT EXISTS revenue (
    month VARCHAR(4) NOT NULL UNIQUE,
    revenue INT NOT NULL
  );`);

  await Promise.all(
    revenue.map((rev) =>
      pgClient.query(
        `
      INSERT INTO revenue (month, revenue)
      VALUES ($1, $2)
      ON CONFLICT (month) DO NOTHING;
    `,
        [rev.month, rev.revenue],
      ),
    ),
  );
}

export async function GET() {
  try {
    console.log("Starting database seeding...");
    await connectClient();
    console.log("pgClient", Response.json(pgClient));

    await seedUsers();
    console.log("Completed seeding users");

    await seedCustomers();
    console.log("Completed seeding customers");

    await seedInvoices();
    console.log("Completed seeding invoices");

    await seedRevenue();
    console.log("Completed seeding revenue");

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    console.error("Error during seeding:", error);
    console.log(JSON.stringify(pgClient, null, 2));
    return Response.json({ error: error }, { status: 500 });
  } finally {
    await disconnectClient();
  }
}
