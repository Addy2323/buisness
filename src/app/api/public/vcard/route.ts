import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const company = await prisma.companyProfile.findUnique({
    where: { id: "hezlon-singleton" },
  });
  const digital = await prisma.digitalProfile.findUnique({
    where: { id: "hezlon-digital-profile" },
  });

  if (!company || (digital && !digital.isPublished)) {
    return NextResponse.json(
      { error: "Digital profile is not published" },
      { status: 404 }
    );
  }

  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const profileUrl =
    company.website ||
    `${proto}://${host}/${digital?.slug || "hezlon"}`;

  const cleanPhone = company.phone.replace(/\s+/g, "");
  const cleanNote = company.description.replace(/\r?\n/g, " ");

  const vcardLines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${company.companyName}`,
    `N:;${company.companyName};;;`,
    `ORG:${company.companyName}`,
    `TITLE:${company.professionalTitle}`,
    `TEL;TYPE=WORK,VOICE:${cleanPhone}`,
    company.whatsapp ? `TEL;TYPE=CELL:${company.whatsapp.replace(/\s+/g, "")}` : "",
    `EMAIL;TYPE=PREF,INTERNET:${company.email}`,
    `URL:${profileUrl}`,
    company.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${company.instagram}` : "",
    company.facebook ? `X-SOCIALPROFILE;TYPE=facebook:${company.facebook}` : "",
    company.physicalAddress
      ? `ADR;TYPE=WORK:;;${company.physicalAddress};;;;`
      : "",
    `NOTE:${cleanNote}`,
    "END:VCARD",
  ].filter(Boolean);

  const vcardContent = vcardLines.join("\r\n");

  return new NextResponse(vcardContent, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="HEZLON-Building-Solutions.vcf"`,
    },
  });
}

