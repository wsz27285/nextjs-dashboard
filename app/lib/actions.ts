'use server';
 
import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
import { redirect } from 'next/navigation';
 export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: '请选择一个客户。',
  }).min(1), // 不允许空字符串,
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: '请选择账单状态。',
  }), // 允许 null 值（如果业务允许）
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State,formData: FormData) {
  // throw new Error('This is a test error.');
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
  // 返回错误信息给前端，而不是让后端崩溃
  return {
    errors: validatedFields.error.flatten().fieldErrors,
    message: '提交失败，请检查表单输入。',
  };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

   try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // We'll also log the error to the console for now
    console.error(error);
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;
 
  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
} 