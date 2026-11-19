export type InfoEntry = {
  id: string;
  entity: string;
  category: "business" | "address" | "accounts";
  title: string;
  keywords: string[];
  fields: { label: string; value: string }[];
};

// Names below were supplied by the user. Other values remain blank until confirmed.
export const importantInfo: InfoEntry[] = [
  {
    id: "business",
    entity: "사업자",
    category: "business",
    title: "사업자 기본 정보",
    keywords: ["사업자등록번호", "대표자", "상호"],
    fields: [
      { label: "상호", value: "" },
      { label: "사업자등록번호", value: "" },
      { label: "대표자", value: "" },
    ],
  },
  ...["마니페스타", "서울더원"].flatMap((entity, i): InfoEntry[] => [
    {
      id: `entity-${i}`,
      entity,
      category: "business",
      title: "기본 정보",
      keywords: [
        "사업자",
        "대표자",
        "상호",
        i === 0 ? "manifesta" : "seoul the one",
      ],
      fields: [
        { label: "이름", value: entity },
        { label: "사업자등록번호", value: "" },
        { label: "연락처", value: "" },
      ],
    },
    {
      id: `address-${i}`,
      entity,
      category: "address",
      title: "주소 · 영문주소",
      keywords: [
        "우편번호",
        "배송",
        "address",
        "english",
        "zip",
        i === 0 ? "manifesta" : "seoul the one",
      ],
      fields: [
        { label: "주소", value: "" },
        { label: "영문주소", value: "" },
        { label: "우편번호", value: "" },
      ],
    },
  ]),
  ...[1, 2, 3].map((n): InfoEntry => ({
    id: `account-${n}`,
    entity: "계좌",
    category: "accounts",
    title: `계좌 ${String(n).padStart(2, "0")}`,
    keywords: ["은행", "계좌번호", "입금", "예금주", "bank"],
    fields: [
      { label: "은행", value: "" },
      { label: "계좌번호", value: "" },
      { label: "예금주", value: "" },
    ],
  })),
];
