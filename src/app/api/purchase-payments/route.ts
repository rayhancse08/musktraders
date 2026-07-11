import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, created } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { dec, dateStr } from "@/lib/services/helpers";

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const payment = await prisma.purchasePayment.create({
    data: {
      purchaseId: parseInt(body.purchase, 10),
      amount: parseFloat(body.amount || "0"),
      date: new Date(body.date),
      accountInformation: body.account_information || null,
      note: body.note || null,
    },
  });
  return created({
    id: payment.id,
    amount: dec(payment.amount),
    date: dateStr(payment.date),
    account_information: payment.accountInformation,
    note: payment.note,
  });
});
