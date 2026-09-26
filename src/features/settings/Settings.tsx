import { Page, PageHeader } from '../../components/layout/AppShell'

export default function Settings(_props: { section?: string; item?: string }) {
  return (
    <Page>
      <PageHeader title="Settings" subtitle="Coming together…" />
    </Page>
  )
}
