import { Page, PageHeader } from '../../components/layout/AppShell'

export default function Progress(_props: { section?: string; item?: string }) {
  return (
    <Page>
      <PageHeader title="Progress" subtitle="Coming together…" />
    </Page>
  )
}
