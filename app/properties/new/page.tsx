import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { propertyIdForOwner } from "@/lib/data/properties";
import { PropertySetupForm } from "./property-setup-form";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const existingId = await propertyIdForOwner(supabase, user.id);
  if (existingId) {
    redirect(`/properties/${existingId}`);
  }

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Add your property
          </h1>
          <p className="text-muted-foreground">
            List where you rent in Bengaluru and document the turmoil with notes
            and photos.
          </p>
        </div>
        <PropertySetupForm />
      </div>
    </div>
  );
}
