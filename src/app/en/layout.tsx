/** Albanian is the root default; this complete subtree is English. */
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>;
}
