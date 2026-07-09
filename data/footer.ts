/** Footer link columns (see components/Footer). */
export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "How can we help ?",
    links: [
      { label: "Help", href: "#" },
      { label: "Track,manage and return order", href: "#" },
      { label: "Product Recalls", href: "#" },
      { label: "Cookie Settings", href: "#" },
    ],
  },
  {
    title: "About us",
    links: [
      { label: "Careers", href: "#" },
      { label: "About DailyValue", href: "#" },
      { label: "Charity", href: "#" },
      { label: "Terms and conditions", href: "#" },
    ],
  },
];
