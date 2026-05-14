import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { BatchCreateForm } from "../components/BatchCreateForm";

export function BatchNewPage() {
  return (
    <PageScaffold padding={4} ariaLabel="Nouveau lot">
      <Stack gap={4}>
        <Heading level={1}>Nouveau lot</Heading>
        <BatchCreateForm />
      </Stack>
    </PageScaffold>
  );
}
