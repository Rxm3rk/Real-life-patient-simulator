import { Page, PageHeader } from '../../components/layout/AppShell'

export default function Home(_props: { section?: string; item?: string }) {
  return (
    <Page>
      <PageHeader title="Home" subtitle="Coming together…" />
    </Page>
  )
}
