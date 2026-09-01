import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const INTEGRATION_GROUPS = [
  {
    title: "Procurement & ERP",
    items: ["Coupa", "SAP Ariba", "SAP", "NetSuite", "Xero"],
  },
  {
    title: "Document capture",
    items: ["Azure Document Intelligence", "AWS Textract"],
  },
  {
    title: "Device management",
    items: ["Microsoft Intune", "Jamf Pro", "Absolute"],
  },
  {
    title: "Identity & HR",
    items: ["Microsoft Entra ID", "Okta", "Workday"],
  },
  {
    title: "Enterprise asset management",
    items: ["ServiceNow HAM Pro", "IBM Maximo", "SAP EAM"],
  },
  {
    title: "Maintenance & warranty",
    items: ["Maximo", "Fiix", "Dell TechDirect", "HP", "Lenovo", "Apple GSX"],
  },
  {
    title: "Real location hardware",
    items: ["GNSS / cellular trackers", "LoRaWAN", "BLE", "RAIN RFID"],
  },
  {
    title: "Reference data",
    items: ["GS1 GTIN", "UNSPSC", "Manufacturer part numbers"],
  },
];

const FUTURE_FEATURES = [
  "Real GPS / GNSS tracking",
  "Real BLE tracking",
  "Real RFID",
  "Real LoRaWAN",
  "Real-time telemetry",
  "Advanced geofencing & movement exemptions",
  "Automated escalation workflows",
  "Real device management",
  "Procurement & ERP integrations",
  "HR integrations",
  "Warranty entitlement integrations",
  "Maintenance system integrations",
  "Advanced analytics & utilisation analysis",
  "Shrinkage analysis",
  "Refresh forecasting",
  "Entitlement recovery",
  "Disposal evidence",
  "Cyclical audits",
  "Managed service operations",
];

export default function RoadmapPage() {
  return (
    <div className="pb-10">
      <PageHeader
        title="Roadmap"
        description="What this MVP demonstrates today, and the integrations planned for a production rollout — built into the data model but not yet connected."
      />

      <div className="px-4 md:px-6">
        <Card className="mb-4">
          <h3 className="text-[13px] font-semibold text-ink mb-1">How the MVP gets there</h3>
          <p className="text-[13px] text-ink-soft leading-relaxed max-w-3xl">
            Simulation Mode stands in for real GPS/BLE/RFID hardware today — it writes to the same
            position and geofence-evaluation tables a live tracker feed would use. Connecting real
            hardware later is a data-source swap, not a data-model rebuild.
          </p>
        </Card>

        <h3 className="text-[13px] font-semibold text-ink mb-2 px-1">Future integrations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {INTEGRATION_GROUPS.map((group) => (
            <Card key={group.title}>
              <h4 className="text-[13px] font-semibold text-ink mb-2">{group.title}</h4>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Badge key={item} tone="muted">{item}</Badge>
                ))}
              </div>
              <div className="mt-2.5">
                <Badge tone="attention">Coming / Future Integration</Badge>
              </div>
            </Card>
          ))}
        </div>

        <h3 className="text-[13px] font-semibold text-ink mb-2 px-1">Future production features</h3>
        <Card>
          <div className="flex flex-wrap gap-2">
            {FUTURE_FEATURES.map((f) => (
              <Badge key={f} tone="neutral">{f}</Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
