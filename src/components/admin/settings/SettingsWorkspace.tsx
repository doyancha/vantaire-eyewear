"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  MessageCircle,
  Phone,
  Truck,
  Share2,
  Info,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  ExternalLink,
} from "lucide-react";
import { updateSiteSettingsAction } from "@/lib/admin/settings-actions";
import { SiteSettingsFormValues } from "@/lib/admin/settings-validation";

export interface SettingsWorkspaceProps {
  initialData: {
    id: number;
    whatsappNumber: string;
    whatsappDisplayNumber: string;
    whatsappIsDemo: boolean;
    whatsappDefaultGreeting: string;
    contactPhone: string;
    contactEmail: string;
    contactHours: string;
    contactFridayHours: string;
    contactLocation: string;
    contactServiceArea: string;
    deliveryInsideDhakaTime: string;
    deliveryOutsideDhakaTime: string;
    deliveryFeeInsideDhaka: number;
    deliveryFeeOutsideDhaka: number;
    deliveryCurrencySymbol: string;
    deliveryCurrencyCode: string;
    deliveryCashOnDelivery: boolean;
    deliveryAdvancePaymentNote: string;
    deliveryPackaging: string;
    socialInstagram: string;
    socialFacebook: string;
    createdAt: string;
    updatedAt: string;
  };
}

export function SettingsWorkspace({ initialData }: SettingsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<SiteSettingsFormValues>({
    expectedUpdatedAt: initialData.updatedAt,
    whatsappNumber: initialData.whatsappNumber,
    whatsappDisplayNumber: initialData.whatsappDisplayNumber,
    whatsappIsDemo: initialData.whatsappIsDemo,
    whatsappDefaultGreeting: initialData.whatsappDefaultGreeting,
    confirmedLiveNumber: !initialData.whatsappIsDemo,
    contactPhone: initialData.contactPhone,
    contactEmail: initialData.contactEmail,
    contactHours: initialData.contactHours,
    contactFridayHours: initialData.contactFridayHours,
    contactLocation: initialData.contactLocation,
    contactServiceArea: initialData.contactServiceArea,
    deliveryInsideDhakaTime: initialData.deliveryInsideDhakaTime,
    deliveryOutsideDhakaTime: initialData.deliveryOutsideDhakaTime,
    deliveryFeeInsideDhaka: initialData.deliveryFeeInsideDhaka,
    deliveryFeeOutsideDhaka: initialData.deliveryFeeOutsideDhaka,
    deliveryCashOnDelivery: initialData.deliveryCashOnDelivery,
    deliveryAdvancePaymentNote: initialData.deliveryAdvancePaymentNote,
    deliveryPackaging: initialData.deliveryPackaging,
    socialInstagram: initialData.socialInstagram || "",
    socialFacebook: initialData.socialFacebook || "",
  });

  const [savedUpdatedAt, setSavedUpdatedAt] = useState<string>(initialData.updatedAt);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);

  // Track dirty state
  const isDirty =
    formData.whatsappNumber !== initialData.whatsappNumber ||
    formData.whatsappDisplayNumber !== initialData.whatsappDisplayNumber ||
    formData.whatsappIsDemo !== initialData.whatsappIsDemo ||
    formData.whatsappDefaultGreeting !== initialData.whatsappDefaultGreeting ||
    formData.contactPhone !== initialData.contactPhone ||
    formData.contactEmail !== initialData.contactEmail ||
    formData.contactHours !== initialData.contactHours ||
    formData.contactFridayHours !== initialData.contactFridayHours ||
    formData.contactLocation !== initialData.contactLocation ||
    formData.contactServiceArea !== initialData.contactServiceArea ||
    formData.deliveryInsideDhakaTime !== initialData.deliveryInsideDhakaTime ||
    formData.deliveryOutsideDhakaTime !== initialData.deliveryOutsideDhakaTime ||
    formData.deliveryFeeInsideDhaka !== initialData.deliveryFeeInsideDhaka ||
    formData.deliveryFeeOutsideDhaka !== initialData.deliveryFeeOutsideDhaka ||
    formData.deliveryCashOnDelivery !== initialData.deliveryCashOnDelivery ||
    formData.deliveryAdvancePaymentNote !== initialData.deliveryAdvancePaymentNote ||
    formData.deliveryPackaging !== initialData.deliveryPackaging ||
    formData.socialInstagram !== (initialData.socialInstagram || "") ||
    formData.socialFacebook !== (initialData.socialFacebook || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setHasConflict(false);

    startTransition(async () => {
      const res = await updateSiteSettingsAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setGeneralError(res.error);
        if (res.error.includes("another session")) {
          setHasConflict(true);
        }
      } else {
        setSuccessMessage(res.message || "Settings updated successfully.");
        setSavedUpdatedAt(res.data.updatedAt);
        setFormData((prev) => ({
          ...prev,
          expectedUpdatedAt: res.data.updatedAt,
        }));
        router.refresh();
      }
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vantaire-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-vantaire-champagne" />
            <h1 className="text-2xl sm:text-3xl font-serif text-vantaire-warmWhite font-normal tracking-tight">
              Site Settings & Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-vantaire-muted mt-1">
            Manage live concierge WhatsApp configuration, business hours, fulfillment rates, and social channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            form="site-settings-form"
            disabled={!isDirty || isPending}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-luxury font-semibold transition-all ${
              isDirty && !isPending
                ? "bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 shadow-lg shadow-vantaire-champagne/20 active:scale-95"
                : "bg-vantaire-charcoal text-vantaire-muted cursor-not-allowed border border-vantaire-border/60"
            }`}
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Demo Warning Banner */}
      {formData.whatsappIsDemo && (
        <div className="bg-amber-950/40 border border-amber-500/50 p-4 sm:p-5 flex items-start gap-3.5 text-amber-200 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-100">
              Demo Configuration Active
            </p>
            <p className="text-amber-300/90 leading-relaxed text-xs">
              Demo configuration — replace with a verified business WhatsApp number before commercial launch.
            </p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 flex items-center gap-3 text-emerald-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error / Conflict Banner */}
      {generalError && (
        <div className="bg-red-950/40 border border-red-500/50 p-4 sm:p-5 text-red-200 text-xs sm:text-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-100">Unable to Save Settings</p>
              <p className="text-red-300/90 mt-0.5 text-xs">{generalError}</p>
            </div>
          </div>
          {hasConflict && (
            <div className="pl-8 pt-1">
              <button
                type="button"
                onClick={handleReload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800/80 border border-red-500/50 text-xs text-white uppercase tracking-wider font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Latest Configuration</span>
              </button>
            </div>
          )}
        </div>
      )}

      <form id="site-settings-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Section A: WhatsApp & Ordering */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 text-emerald-400 border-b border-vantaire-border/60 pb-3">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-serif text-lg sm:text-xl text-vantaire-warmWhite">
              WhatsApp & Ordering Concierge
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="whatsappNumber" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Machine Number (Digits Only) *
              </label>
              <input
                id="whatsappNumber"
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value.trim() })}
                placeholder="e.g. 8801700000000"
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              <p className="text-[11px] text-vantaire-muted">
                International format without &quot;+&quot; or symbols (e.g. 88017XXXXXXXX).
              </p>
              {fieldErrors.whatsappNumber && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.whatsappNumber[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="whatsappDisplayNumber" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Display Number (Public Copy) *
              </label>
              <input
                id="whatsappDisplayNumber"
                type="text"
                value={formData.whatsappDisplayNumber}
                onChange={(e) => setFormData({ ...formData, whatsappDisplayNumber: e.target.value })}
                placeholder="e.g. +880 1700-000000"
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              <p className="text-[11px] text-vantaire-muted">
                Digits must match the machine number exactly when formatted.
              </p>
              {fieldErrors.whatsappDisplayNumber && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.whatsappDisplayNumber[0]}</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-vantaire-black/60 border border-vantaire-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-luxury font-semibold text-vantaire-warmWhite block">
                  Configuration Mode: {formData.whatsappIsDemo ? "Demo Mode" : "Live Confirmed Mode"}
                </span>
                <span className="text-[11px] text-vantaire-muted">
                  Toggle to indicate whether the current WhatsApp number is a placeholder or live business line.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextDemo = !formData.whatsappIsDemo;
                  setFormData({
                    ...formData,
                    whatsappIsDemo: nextDemo,
                    confirmedLiveNumber: nextDemo ? false : formData.confirmedLiveNumber,
                  });
                }}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold border transition-all ${
                  formData.whatsappIsDemo
                    ? "bg-amber-950/60 border-amber-500/60 text-amber-300"
                    : "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                }`}
              >
                {formData.whatsappIsDemo ? "Demo Active" : "Live Active"}
              </button>
            </div>

            {!formData.whatsappIsDemo && (
              <div className="pt-3 border-t border-vantaire-border/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.confirmedLiveNumber ?? false}
                    onChange={(e) => setFormData({ ...formData, confirmedLiveNumber: e.target.checked })}
                    className="mt-0.5 accent-emerald-500 rounded-none w-4 h-4"
                  />
                  <span className="text-xs text-vantaire-sand">
                    I confirm this WhatsApp number belongs to the business and has been verified for client communications.
                  </span>
                </label>
                {fieldErrors.confirmedLiveNumber && (
                  <p className="text-[11px] text-red-400 font-medium mt-1">{fieldErrors.confirmedLiveNumber[0]}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="whatsappDefaultGreeting" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
              Default General WhatsApp Greeting *
            </label>
            <textarea
              id="whatsappDefaultGreeting"
              rows={2}
              value={formData.whatsappDefaultGreeting}
              onChange={(e) => setFormData({ ...formData, whatsappDefaultGreeting: e.target.value })}
              className="w-full bg-vantaire-black border border-vantaire-border/80 p-3 text-xs sm:text-sm text-vantaire-sand focus:outline-none focus:border-vantaire-champagne leading-relaxed"
            />
            <p className="text-[11px] text-vantaire-muted">
              Pre-filled greeting used when visitors initiate a conversation via general concierge buttons.
            </p>
            {fieldErrors.whatsappDefaultGreeting && (
              <p className="text-[11px] text-red-400 font-medium">{fieldErrors.whatsappDefaultGreeting[0]}</p>
            )}
          </div>
        </div>

        {/* Section B: Contact & Business Hours */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 text-vantaire-champagne border-b border-vantaire-border/60 pb-3">
            <Phone className="w-5 h-5" />
            <h2 className="font-serif text-lg sm:text-xl text-vantaire-warmWhite">
              Business Contact & Hours
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="contactPhone" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Customer Phone *
              </label>
              <input
                id="contactPhone"
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactPhone && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactPhone[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactEmail" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Contact Email *
              </label>
              <input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value.trim() })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactEmail && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactEmail[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactHours" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Regular Hours *
              </label>
              <input
                id="contactHours"
                type="text"
                value={formData.contactHours}
                onChange={(e) => setFormData({ ...formData, contactHours: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactHours && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactHours[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactFridayHours" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Friday Schedule *
              </label>
              <input
                id="contactFridayHours"
                type="text"
                value={formData.contactFridayHours}
                onChange={(e) => setFormData({ ...formData, contactFridayHours: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactFridayHours && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactFridayHours[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactLocation" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Location *
              </label>
              <input
                id="contactLocation"
                type="text"
                value={formData.contactLocation}
                onChange={(e) => setFormData({ ...formData, contactLocation: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactLocation && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactLocation[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactServiceArea" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Service Area *
              </label>
              <input
                id="contactServiceArea"
                type="text"
                value={formData.contactServiceArea}
                onChange={(e) => setFormData({ ...formData, contactServiceArea: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.contactServiceArea && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.contactServiceArea[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section C: Delivery & Logistics */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 text-vantaire-champagne border-b border-vantaire-border/60 pb-3">
            <Truck className="w-5 h-5" />
            <h2 className="font-serif text-lg sm:text-xl text-vantaire-warmWhite">
              Delivery & Fulfillment Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="deliveryInsideDhakaTime" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Inside Dhaka Estimate *
              </label>
              <input
                id="deliveryInsideDhakaTime"
                type="text"
                value={formData.deliveryInsideDhakaTime}
                onChange={(e) => setFormData({ ...formData, deliveryInsideDhakaTime: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.deliveryInsideDhakaTime && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryInsideDhakaTime[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deliveryOutsideDhakaTime" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Outside Dhaka Estimate *
              </label>
              <input
                id="deliveryOutsideDhakaTime"
                type="text"
                value={formData.deliveryOutsideDhakaTime}
                onChange={(e) => setFormData({ ...formData, deliveryOutsideDhakaTime: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.deliveryOutsideDhakaTime && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryOutsideDhakaTime[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deliveryFeeInsideDhaka" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Inside Dhaka Fee (BDT ৳) *
              </label>
              <input
                id="deliveryFeeInsideDhaka"
                type="number"
                min="0"
                step="1"
                value={formData.deliveryFeeInsideDhaka}
                onChange={(e) => setFormData({ ...formData, deliveryFeeInsideDhaka: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.deliveryFeeInsideDhaka && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryFeeInsideDhaka[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deliveryFeeOutsideDhaka" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Outside Dhaka Fee (BDT ৳) *
              </label>
              <input
                id="deliveryFeeOutsideDhaka"
                type="number"
                min="0"
                step="1"
                value={formData.deliveryFeeOutsideDhaka}
                onChange={(e) => setFormData({ ...formData, deliveryFeeOutsideDhaka: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.deliveryFeeOutsideDhaka && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryFeeOutsideDhaka[0]}</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-vantaire-black/60 border border-vantaire-border/70 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-luxury font-semibold text-vantaire-warmWhite block">
                Cash on Delivery (COD) Availability
              </span>
              <span className="text-[11px] text-vantaire-muted">
                Controls whether public storefront headers and badges advertise Cash on Delivery.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, deliveryCashOnDelivery: !formData.deliveryCashOnDelivery })}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold border transition-all ${
                formData.deliveryCashOnDelivery
                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                  : "bg-red-950/60 border-red-500/60 text-red-300"
              }`}
            >
              {formData.deliveryCashOnDelivery ? "COD Enabled" : "COD Paused"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="deliveryAdvancePaymentNote" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Advance Payment Terms Note *
              </label>
              <textarea
                id="deliveryAdvancePaymentNote"
                rows={2}
                value={formData.deliveryAdvancePaymentNote}
                onChange={(e) => setFormData({ ...formData, deliveryAdvancePaymentNote: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 p-3 text-xs sm:text-sm text-vantaire-sand focus:outline-none focus:border-vantaire-champagne leading-relaxed"
              />
              {fieldErrors.deliveryAdvancePaymentNote && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryAdvancePaymentNote[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deliveryPackaging" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                Signature Packaging Standards *
              </label>
              <textarea
                id="deliveryPackaging"
                rows={2}
                value={formData.deliveryPackaging}
                onChange={(e) => setFormData({ ...formData, deliveryPackaging: e.target.value })}
                className="w-full bg-vantaire-black border border-vantaire-border/80 p-3 text-xs sm:text-sm text-vantaire-sand focus:outline-none focus:border-vantaire-champagne leading-relaxed"
              />
              {fieldErrors.deliveryPackaging && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.deliveryPackaging[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section D: Social Channels */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 text-vantaire-champagne border-b border-vantaire-border/60 pb-3">
            <Share2 className="w-5 h-5" />
            <h2 className="font-serif text-lg sm:text-xl text-vantaire-warmWhite">
              Official Social Profiles
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="socialInstagram" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                  Instagram Profile URL
                </label>
                {formData.socialInstagram && (
                  <a
                    href={formData.socialInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-vantaire-champagne hover:underline"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                id="socialInstagram"
                type="url"
                value={formData.socialInstagram}
                onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value.trim() })}
                placeholder="https://instagram.com/vantaireeyewear"
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              <p className="text-[11px] text-vantaire-muted">
                Leave blank if no official profile is active. Must start with https://instagram.com/
              </p>
              {fieldErrors.socialInstagram && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.socialInstagram[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="socialFacebook" className="block text-xs font-semibold uppercase tracking-luxury text-vantaire-warmWhite">
                  Facebook Page URL
                </label>
                {formData.socialFacebook && (
                  <a
                    href={formData.socialFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-vantaire-champagne hover:underline"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                id="socialFacebook"
                type="url"
                value={formData.socialFacebook}
                onChange={(e) => setFormData({ ...formData, socialFacebook: e.target.value.trim() })}
                placeholder="https://facebook.com/vantaireeyewear"
                className="w-full bg-vantaire-black border border-vantaire-border/80 px-3.5 py-2.5 text-xs sm:text-sm text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              <p className="text-[11px] text-vantaire-muted">
                Leave blank if no official page is active. Must start with https://facebook.com/
              </p>
              {fieldErrors.socialFacebook && (
                <p className="text-[11px] text-red-400 font-medium">{fieldErrors.socialFacebook[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section E: Read-Only System Information */}
        <div className="bg-vantaire-black/40 border border-vantaire-border/60 p-6 space-y-4 text-xs text-vantaire-muted">
          <div className="flex items-center gap-2 text-vantaire-sand">
            <Info className="w-4 h-4 text-vantaire-champagne" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              System Configuration Identity
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 font-mono text-[11px]">
            <div>
              <span className="text-vantaire-muted block">Singleton ID:</span>
              <span className="text-vantaire-warmWhite">{initialData.id}</span>
            </div>
            <div>
              <span className="text-vantaire-muted block">Currency:</span>
              <span className="text-vantaire-warmWhite">
                {initialData.deliveryCurrencyCode} ({initialData.deliveryCurrencySymbol})
              </span>
            </div>
            <div>
              <span className="text-vantaire-muted block">Created At:</span>
              <span className="text-vantaire-warmWhite truncate block">
                {new Date(initialData.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-vantaire-muted block">Last Modified:</span>
              <span className="text-vantaire-warmWhite truncate block">
                {new Date(savedUpdatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
