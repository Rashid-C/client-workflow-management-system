import type { Metadata } from "next";
import EmployeeList from "@/components/employees/employee-list";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/employees">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.employees.title, description: t.employees.subtitle };
}

export default async function EmployeesPage({ params }: PageProps<"/[lang]/employees">) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page>
      <PageHeader eyebrow={t.employees.eyebrow} title={t.employees.title} subtitle={t.employees.subtitle} />

      <EmployeeList />
    </Page>
  );
}
