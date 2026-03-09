import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ExamSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
}

interface ExamBooking {
  id: string;
  slot_id: string;
  full_name: string;
  status: string;
  created_at: string;
  exam_slots: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

interface ExamBookingCardProps {
  userId: string;
  hasAccess: boolean;
  compact?: boolean;
}

export function ExamBookingCard({ userId, hasAccess, compact }: ExamBookingCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<ExamSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myBookings, setMyBookings] = useState<ExamBooking[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableDates();
    fetchMyBookings();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlotsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableDates = async () => {
    const { data } = await supabase
      .from("exam_slots")
      .select("date")
      .eq("is_active", true)
      .gte("date", new Date().toISOString().split("T")[0]);

    if (data) {
      const dates = [...new Set(data.map((s) => s.date))].map((d) => new Date(d + "T00:00:00"));
      setAvailableDates(dates);
    }
  };

  const fetchSlotsForDate = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const { data } = await supabase
      .from("exam_slots")
      .select("*")
      .eq("date", dateStr)
      .eq("is_active", true)
      .order("start_time");

    setSlots(data || []);
    setSelectedSlot(null);
  };

  const fetchMyBookings = async () => {
    const { data } = await supabase
      .from("exam_bookings")
      .select("id, slot_id, full_name, status, created_at, exam_slots(date, start_time, end_time)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setMyBookings((data as any) || []);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !fullName.trim()) {
      toast({
        title: "Mangler informasjon",
        description: "Velg tidspunkt og skriv inn navn",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("exam_bookings").insert({
        user_id: userId,
        slot_id: selectedSlot,
        full_name: fullName.trim(),
      });

      if (error) throw error;

      toast({ title: "Forespørsel sendt!", description: "Du vil få svar fra admin." });
      setSelectedSlot(null);
      setFullName("");
      setSelectedDate(undefined);
      setDialogOpen(false);
      fetchMyBookings();
      fetchAvailableDates();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message?.includes("unique") ? "Du har allerede booket dette tidspunktet" : "Kunne ikke sende forespørsel",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAccess) return null;

  const statusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Bekreftet ✅";
      case "rejected": return "Avslått ❌";
      case "rescheduled": return "Flyttet 🔄";
      default: return "Venter ⏳";
    }
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(
      (d) => d.toDateString() === date.toDateString()
    );
  };

  const pendingCount = myBookings.filter((b) => b.status === "pending").length;
  const confirmedCount = myBookings.filter((b) => b.status === "confirmed").length;

  const bookingForm = (
    <div className="space-y-4">
      <div>
        <Label>Velg dato</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: nb }) : "Velg en dato"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={nb}
              disabled={(date) => date < new Date() || !isDateAvailable(date)}
              className="pointer-events-auto"
              modifiers={{ available: availableDates }}
              modifiersClassNames={{
                available: "bg-emerald-100 dark:bg-emerald-900/40 font-bold",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && slots.length > 0 && (
        <div className="space-y-2">
          <Label>Velg tidspunkt</Label>
          <div className="grid grid-cols-2 gap-2">
            {slots
              .filter((s) => s.current_bookings < s.max_bookings)
              .map((slot) => (
                <Button
                  key={slot.id}
                  variant={selectedSlot === slot.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSlot(slot.id)}
                  className="justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                </Button>
              ))}
          </div>
          {slots.filter((s) => s.current_bookings < s.max_bookings).length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen ledige tider denne dagen</p>
          )}
        </div>
      )}

      {selectedDate && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">Ingen tider tilgjengelig denne dagen</p>
      )}

      {selectedSlot && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label htmlFor="exam-name">Fullt navn</Label>
            <Input
              id="exam-name"
              placeholder="Skriv inn ditt fulle navn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sender...</>
            ) : (
              "Send forespørsel"
            )}
          </Button>
        </div>
      )}

      {myBookings.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">Mine bookinger</h4>
          {myBookings.map((b) => (
            <div key={b.id} className="text-sm p-2 rounded bg-background border">
              <div className="flex justify-between">
                <span>
                  {b.exam_slots?.date} kl. {b.exam_slots?.start_time?.slice(0, 5)}
                </span>
                <span>{statusLabel(b.status)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Card className="py-2 border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Book eksamen</CardTitle>
              <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-extrabold tracking-tight">{confirmedCount}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingCount > 0 ? `${pendingCount} venter på svar` : "Trykk for å booke"}
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book eksamen</DialogTitle>
          </DialogHeader>
          {bookingForm}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardHeader className="flex flex-row items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <div>
          <CardTitle className="text-lg">Book eksamen</CardTitle>
          <p className="text-sm text-muted-foreground">Velg dato og tid for din eksamen</p>
        </div>
      </CardHeader>
      <CardContent>{bookingForm}</CardContent>
    </Card>
  );
}
