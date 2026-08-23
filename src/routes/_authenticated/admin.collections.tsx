import { createFileRoute } from "@tanstack/react-router";
import { CollectionManager } from "@/components/admin/CollectionManager";

export const Route = createFileRoute("/_authenticated/admin/collections")({
  component: CollectionManager,
});
