"use server";

import { z } from "zod";
import { getDbClient } from "./data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const createInvoiceFormSchema = z.object({
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
});

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = createInvoiceFormSchema.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  const client = await getDbClient();
  await client.query(
    `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES ($1, $2, $3, $4)
    `,
    [customerId, amountInCents, status, date],
  );
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const updateFormSchema = z.object({
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
});

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = updateFormSchema.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  const client = await getDbClient();
  await client.query(
    `
    UPDATE invoices
    SET customer_id = $1, amount = $2, status = $3
    WHERE id = $4
  `,
    [customerId, amountInCents, status, id],
  );

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
