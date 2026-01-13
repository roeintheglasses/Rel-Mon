import { OrganizationList } from "@clerk/nextjs";

export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-semibold text-gray-900 dark:text-white">
          Select an Organization
        </h1>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/board"
          afterCreateOrganizationUrl="/board"
        />
      </div>
    </div>
  );
}
