import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, User, FileText, BadgeEuro, CreditCard, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateContactForm from "@/components/admin-create/CreateContactForm";
import CreateLeadForm from "@/components/admin-create/CreateLeadForm";
import CreateSaleForm from "@/components/admin-create/CreateSaleForm";
import CreatePaymentsForm from "@/components/admin-create/CreatePaymentsForm";

const STEPS = [
  { key: "contact", label: "Contact", icon: User },
  { key: "lead", label: "Lead", icon: FileText },
  { key: "sale", label: "Vente", icon: BadgeEuro },
  { key: "payments", label: "Paiements", icon: CreditCard },
] as const;

export default function AdminCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // IDs created in wizard mode
  const [createdContactId, setCreatedContactId] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [createdSaleId, setCreatedSaleId] = useState<string | null>(null);
  const [skipLead, setSkipLead] = useState(false);
  const [skipSale, setSkipSale] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Tabs defaultValue="wizard">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="wizard" className="gap-1.5"><Wand2 className="h-4 w-4" />Wizard</TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5"><User className="h-4 w-4" />Contact</TabsTrigger>
          <TabsTrigger value="lead" className="gap-1.5"><FileText className="h-4 w-4" />Lead</TabsTrigger>
          <TabsTrigger value="sale" className="gap-1.5"><BadgeEuro className="h-4 w-4" />Vente</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><CreditCard className="h-4 w-4" />Paiements</TabsTrigger>
        </TabsList>

        {/* ── Wizard multi-étapes ── */}
        <TabsContent value="wizard" className="space-y-6 mt-6">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const completed = i < step;
              const active = i === step;
              return (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors shrink-0",
                    completed && "bg-primary border-primary text-primary-foreground",
                    active && "border-primary text-primary",
                    !completed && !active && "border-muted-foreground/30 text-muted-foreground/50"
                  )}>
                    {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn("text-sm font-medium hidden sm:block", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                  {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
                </div>
              );
            })}
          </div>

          {step === 0 && (
            <CreateContactForm isWizardStep onCreated={(id) => { setCreatedContactId(id); setStep(1); }} />
          )}
          {step === 1 && (
            <CreateLeadForm
              isWizardStep
              prefilledContactId={createdContactId}
              onCreated={(id) => { setCreatedLeadId(id); setStep(2); }}
              onBack={() => setStep(0)}
              onSkip={() => { setSkipLead(true); setStep(2); }}
            />
          )}
          {step === 2 && (
            <CreateSaleForm
              isWizardStep
              prefilledContactId={createdContactId}
              prefilledLeadId={createdLeadId}
              onCreated={(id) => { setCreatedSaleId(id); setStep(3); }}
              onBack={() => setStep(1)}
              onSkip={() => { setSkipSale(true); setStep(3); }}
            />
          )}
          {step === 3 && (
            <CreatePaymentsForm
              isWizardStep
              prefilledContactId={createdContactId}
              prefilledSaleId={createdSaleId}
              onBack={() => setStep(2)}
              onFinishSkip={() => navigate("/admin/data")}
            />
          )}
        </TabsContent>

        {/* ── Onglets individuels ── */}
        <TabsContent value="contact" className="mt-6">
          <CreateContactForm />
        </TabsContent>
        <TabsContent value="lead" className="mt-6">
          <CreateLeadForm />
        </TabsContent>
        <TabsContent value="sale" className="mt-6">
          <CreateSaleForm />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <CreatePaymentsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
