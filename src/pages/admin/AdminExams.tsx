import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Trash2, Check, X, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ExamSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
  is_active: boolean;
}

interface ExamBooking {
  id: string;
  full_name: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_id: string;
  exam_slots: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

export default function AdminExams() {
  const [slots, setSlots] = useState<ExamSlot[]>([]);
  const [bookings, setBookings] = useState<ExamBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [maxBookings, setMaxBookings] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
    fetchBookings();
  }, []);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("exam_slots")
      .select("*")
      .order("date")
      .order("start_time");
    setSlots(data || []);
  };

  const fetchBookings = async () => {
    const { data } = await supabase
      .from("exam_bookings")
      .select("id, full_name, status, admin_note, created_at, user_id, exam_slots(date, start_time, end_time)")
      .order("created_at", { ascending: false });
    setBookings((data as any) || []);
  };

  const addSlot = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("exam_slots").insert({
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        max_bookings: maxBookings,
      });
      if (error) throw error;
      toast({ title: "Tidspunkt lagt til" });
      fetchSlots();
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteSlot = async (id: string) => {
    await supabase.from("exam_slots").delete().eq("id", id);
    fetchSlots();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("exam_bookings")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Booking ${status === "confirmed" ? "bekreftet" : status === "rejected" ? "avslått" : "oppdatert"}` });
      fetchBookings();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-emerald-600">Bekreftet</Badge>;
      case "rejected": return <Badge variant="destructive">Avslått</Badge>;
      case "rescheduled": return <Badge variant="secondary">Flyttet</Badge>;
      default: return <Badge variant="outline">Venter</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Eksamen</h2>
          <p className="text-muted-foreground">Administrer eksamenstider og bookinger</p>
        </div>

        <Tabs defaultValue="slots">
          <TabsList>
            <TabsTrigger value="slots">Ledige tider</TabsTrigger>
            <TabsTrigger value="bookings">
              Bookinger {bookings.filter(b => b.status === "pending").length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {bookings.filter(b => b.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />
                  Legg til ny tid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={nb}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border pointer-events-auto"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fra</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Til</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Maks antall bookinger</Label>
                  <Input type="number" min={1} value={maxBookings} onChange={(e) => setMaxBookings(Number(e.target.value))} />
                </div>
                <Button onClick={addSlot} disabled={loading || !selectedDate} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Legg til tidspunkt
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alle tider</CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Ingen tider opprettet ennå</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div>
                          <span className="font-medium">{slot.date}</span>
                          <span className="text-muted-foreground ml-2">
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({slot.current_bookings}/{slot.max_bookings} booket)
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteSlot(slot.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alle bookinger</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Ingen bookinger ennå</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="p-4 rounded-md border space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{booking.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.exam_slots?.date} kl. {booking.exam_slots?.start_time?.slice(0, 5)} – {booking.exam_slots?.end_time?.slice(0, 5)}
                            </p>
                          </div>
                          {statusBadge(booking.status)}
                        </div>
                        {booking.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateBookingStatus(booking.id, "confirmed")} className="bg-emerald-600 hover:bg-emerald-700">
                              <Check className="h-4 w-4 mr-1" /> Bekreft
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateBookingStatus(booking.id, "rejected")}>
                              <X className="h-4 w-4 mr-1" /> Avslå
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, "rescheduled")}>
                              <ArrowRight className="h-4 w-4 mr-1" /> Flytt
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
