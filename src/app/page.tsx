
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager from "@/components/clients-manager"
import AccountsManager, { Account, DrawData } from "@/components/accounts-manager"
import LedgerRecord from "@/components/ledger-record"
import AdminPanel from "@/components/admin-panel"
import { Users, Building, ArrowLeft, Calendar as CalendarIcon, History, FileSpreadsheet, Shield, PlusCircle, Trash2, X } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useClients } from "@/hooks/useClients"
import { useSheetLog, type SavedSheetInfo } from "@/hooks/useSheetLog"
import { useDeclaredNumbers } from "@/hooks/useDeclaredNumbers"
import type { Client } from "@/hooks/useClients"
import { useUser } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { useAuth } from "@/firebase"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7h18" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M17-3v18" />
      <path d="M3 17h18" />
    </svg>
  )
}

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];
type ActiveSheet = {
    draw: string;
    date: Date;
};


export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void; clearSheet: () => void; getClientData: (clientId: string) => any, getClientCurrentData: (clientId: string) => any | undefined, getClientPreviousData: (clientId: string) => any | undefined }>(null);
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [lastEntry, setLastEntry] = useState('');
  const [isLastEntryDialogOpen, setIsLastEntryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sheet");

  const [declarationDialogOpen, setDeclarationDialogOpen] = useState(false);
  const [declarationDraw, setDeclarationDraw] = useState("");
  const [declarationNumber, setDeclarationNumber] = useState("");
  const { toast } = useToast();
  
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const isMobile = useIsMobile();

  const { clients, addClient, updateClient, deleteClient, handleClientTransaction, clearClientData } = useClients(user?.uid);
  const { savedSheetLog, addSheetLogEntry, deleteSheetLogsForDraw } = useSheetLog(user?.uid);
  const { declaredNumbers, setDeclaredNumber, removeDeclaredNumber, getDeclaredNumber, setDeclaredNumberLocal } = useDeclaredNumbers(user?.uid);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drawToDelete, setDrawToDelete] = useState<{ draw: string; date: Date } | null>(null);
  
  const [formSelectedDraw, setFormSelectedDraw] = useState<string | null>(null);
  const [formSelectedDate, setFormSelectedDate] = useState<Date>(new Date());
  const [activeSheets, setActiveSheets] = useState<ActiveSheet[]>([]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const updateAccountsFromLog = useCallback(() => {
    const dateForCalc = new Date(); // Always use current date context

    const allLogs = Object.values(savedSheetLog).flat();

    const newAccounts = clients.map(client => {
        const clientCommissionPercent = parseFloat(client.comm) / 100;
        const passingMultiplier = parseFloat(client.pair) || 80;
        
        let runningBalance = client.activeBalance || 0;
        
        const allLogsForClient = allLogs
            .filter(log => log.clientId === client.id)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        allLogsForClient.forEach(log => {
            const logDate = new Date(log.date);
            // This calculation part should probably use the date of the log itself for historical balance.
            // For the daily summary, we should only consider logs up to the start of the currently selected day.
            const selectedDayStart = new Date(dateForCalc);
            selectedDayStart.setHours(0,0,0,0);
            
            if (logDate < selectedDayStart) {
                const declaredNumberForLogDate = getDeclaredNumber(log.draw, logDate);
                const passingAmountInLog = declaredNumberForLogDate ? parseFloat(log.data[declaredNumberForLogDate] || "0") : 0;
                
                const gameTotal = log.gameTotal;
                const commission = gameTotal * clientCommissionPercent;
                const netFromGames = gameTotal - commission;
                const winnings = passingAmountInLog * passingMultiplier;
                const netResultForLog = netFromGames - winnings;

                runningBalance += netResultForLog;
            }
        });

        const updatedDrawsForSelectedDay: { [key: string]: DrawData } = {};
        draws.forEach(drawName => {
            const drawLogs = savedSheetLog[drawName] || [];
            const clientLogForSelectedDay = drawLogs.find(log =>
                log.clientId === client.id &&
                isSameDay(new Date(log.date), dateForCalc)
            );

            const totalAmount = clientLogForSelectedDay?.gameTotal || 0;
            
            const declaredNumberForSelectedDay = getDeclaredNumber(drawName, dateForCalc);
            const passingAmount = declaredNumberForSelectedDay && clientLogForSelectedDay
                ? parseFloat(clientLogForSelectedDay.data[declaredNumberForSelectedDay] || "0")
                : 0;
            
            const commissionOnDay = totalAmount * clientCommissionPercent;
            const netFromGamesOnDay = totalAmount - commissionOnDay;
            const winningsOnDay = passingAmount * passingMultiplier;
            const netResultForDay = netFromGamesOnDay - winningsOnDay;

            if (clientLogForSelectedDay) {
                runningBalance += netResultForDay;
            }

            updatedDrawsForSelectedDay[drawName] = { totalAmount, passingAmount };
        });

        return {
            id: client.id,
            clientName: client.name,
            balance: runningBalance,
            draws: updatedDrawsForSelectedDay,
        };
    });

    setAccounts(newAccounts);
}, [clients, savedSheetLog, getDeclaredNumber]);


  useEffect(() => {
    updateAccountsFromLog();
  }, [updateAccountsFromLog]);


  const handleClientUpdateForSheet = (client: Client) => {
    if (gridSheetRef.current) {
      gridSheetRef.current.handleClientUpdate(client);
    }
  };
  
  const handleAddSheet = () => {
    if(formSelectedDraw && formSelectedDate) {
        const newSheet: ActiveSheet = { draw: formSelectedDraw, date: formSelectedDate };
        if (!activeSheets.some(s => s.draw === newSheet.draw && isSameDay(s.date, newSheet.date))) {
            setActiveSheets(prev => [...prev, newSheet]);
        }
    }
  };

  const handleOpenSheet = (sheet: ActiveSheet) => {
    setSelectedDraw(sheet.draw);
    setSelectedDate(sheet.date);
  };
  
  const handleRemoveSheet = (sheetToRemove: ActiveSheet) => {
    setActiveSheets(prev => prev.filter(s => !(s.draw === sheetToRemove.draw && isSameDay(s.date, sheetToRemove.date))));
  };

  const handleBackToDraws = () => {
    setSelectedDraw(null);
  };
  
  const handleClientSheetSave = (clientName: string, clientId: string, newData: { [key: string]: string }, draw: string, entryDate: Date) => {
    const todayStr = entryDate.toISOString().split('T')[0];

    const existingLog = (savedSheetLog[draw] || []).find(log => log.clientId === clientId && log.date === todayStr);

    if (existingLog) {
      const mergedData: { [key: string]: string } = { ...existingLog.data };
      Object.entries(newData).forEach(([key, value]) => {
          mergedData[key] = String((parseFloat(mergedData[key]) || 0) + (parseFloat(value) || 0));
      });
      const newTotal = Object.values(mergedData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const updatedLog = {
          ...existingLog,
          gameTotal: newTotal,
          data: mergedData,
      };
      addSheetLogEntry(updatedLog);
    } else {
      const newEntryTotal = Object.values(newData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const newEntry: Omit<SavedSheetInfo, 'id'> = {
          clientName,
          clientId,
          gameTotal: newEntryTotal,
          data: newData,
          date: todayStr,
          draw,
      };
      addSheetLogEntry(newEntry);
    }

    toast({
        title: "Sheet Saved",
        description: `${clientName}'s data has been logged.`,
    });
  };

  const handleDeclarationInputChange = (draw: string, value: string, entryDate: Date) => {
    const numValue = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDeclaredNumberLocal(draw, numValue, entryDate);
    
    if (numValue.length === 2) {
      setDeclarationDraw(draw);
      setDeclarationNumber(numValue);
      setDeclarationDialogOpen(true);
    }
  };
  
  const handleDeclareOrUndeclare = () => {
    const dateToUse = selectedDate || new Date();
    if (declarationNumber.length === 2 && dateToUse) {
      setDeclaredNumber(declarationDraw, declarationNumber, dateToUse);
      toast({ title: "Success", description: `Result processed for draw ${declarationDraw}.` });
    }
    setDeclarationDialogOpen(false);
  };
  
  const handleUndeclare = () => {
    const dateToUse = selectedDate || new Date();
    if (dateToUse) {
      removeDeclaredNumber(declarationDraw, dateToUse);
      toast({ title: "Success", description: `Result undeclared for draw ${declarationDraw}.` });
    }
    setDeclarationDialogOpen(false);
  };

  const handleDeleteDrawSheets = () => {
    if (drawToDelete && user?.uid) {
        deleteSheetLogsForDraw(drawToDelete.draw, drawToDelete.date);
        handleRemoveSheet({ draw: drawToDelete.draw, date: drawToDelete.date });
    }
    setDrawToDelete(null);
  };
  
  const TabListContent = () => (
    <TabsList className={cn("grid w-full grid-cols-5 p-0.5 gap-0.5", !isMobile && "md:w-auto")}>
      <TabsTrigger value="sheet" className="gap-1 rounded-sm h-14 md:h-10">
        <GridIcon className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">Home</span>
      </TabsTrigger>
      <TabsTrigger value="clients" className="gap-1 rounded-sm h-14 md:h-10">
        <Users className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">CLIENTS</span>
      </TabsTrigger>
      <TabsTrigger value="accounts" className="gap-1 rounded-sm h-14 md:h-10">
        <Building className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">ACCOUNT LEDGER</span>
      </TabsTrigger>
      <TabsTrigger value="ledger-record" className="gap-1 rounded-sm h-14 md:h-10">
        <FileSpreadsheet className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">Client Performance</span>
      </TabsTrigger>
      <TabsTrigger value="admin-panel" className="gap-1 rounded-sm h-14 md:h-10">
        <Shield className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline">Admin Panel</span>
      </TabsTrigger>
    </TabsList>
  );

  if (isUserLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const isSheetAlreadyAdded = activeSheets.some(s => s.draw === formSelectedDraw && formSelectedDate && isSameDay(s.date, formSelectedDate));


  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <main className="flex-1 p-2 md:p-4 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
            <div className="flex items-center flex-grow">
              {isMobile ? (
                  <ScrollArea className="w-full whitespace-nowrap">
                      <TabListContent />
                  </ScrollArea>
              ) : (
                  <TabListContent />
              )}
            </div>
               {selectedDraw && activeTab === 'sheet' && (
                 <div className="flex items-center">
                    <Button onClick={handleBackToDraws} variant="ghost" className="ml-2">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                    <Button onClick={() => setIsLastEntryDialogOpen(true)} variant="outline" size="sm" className="ml-2">
                        <History className="mr-2 h-4 w-4" />
                        Last Entry
                    </Button>
                </div>
              )}
          </div>
          <TabsContent value="sheet" className="flex-1 flex flex-col min-h-0">
            {selectedDraw ? (
              <GridSheet 
                ref={gridSheetRef} 
                draw={selectedDraw} 
                date={selectedDate} 
                lastEntry={lastEntry} 
                setLastEntry={setLastEntry} 
                isLastEntryDialogOpen={isLastEntryDialogOpen} 
                setIsLastEntryDialogOpen={setIsLastEntryDialogOpen}
                clients={clients}
                onClientSheetSave={handleClientSheetSave}
                savedSheetLog={savedSheetLog[selectedDraw] || []}
                accounts={accounts}
                draws={draws}
              />
            ) : (
              <div className="flex flex-col items-center justify-start w-full h-full pt-8">
                <Card className="w-full max-w-md mb-8">
                    <CardHeader>
                        <CardTitle>Create or Open a Sheet</CardTitle>
                        <CardDescription>Select a draw and a date to add it to your dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Select onValueChange={setFormSelectedDraw}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Draw" />
                                </SelectTrigger>
                                <SelectContent>
                                    {draws.map(draw => (
                                        <SelectItem key={draw} value={draw}>{draw}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                           <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formSelectedDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formSelectedDate ? format(formSelectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={formSelectedDate}
                                  onSelect={(date) => date && setFormSelectedDate(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleAddSheet} className="w-full" disabled={!formSelectedDraw || !formSelectedDate || isSheetAlreadyAdded}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Sheet
                        </Button>
                         {isSheetAlreadyAdded && (
                            <p className="text-sm text-center text-muted-foreground">This sheet has already been added.</p>
                        )}
                    </CardContent>
                </Card>
                
                {activeSheets.length > 0 && (
                    <div className="w-full max-w-4xl">
                        <h2 className="text-xl font-semibold mb-4 text-center">Today's Sheets</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {activeSheets.map((sheet, index) => (
                                <Card key={index} className="flex flex-col cursor-pointer hover:border-primary transition-colors">
                                    <CardHeader className="flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-lg">{sheet.draw}</CardTitle>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDrawToDelete({ draw: sheet.draw, date: sheet.date }) }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleRemoveSheet(sheet) }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-4" onClick={() => handleOpenSheet(sheet)}>
                                        <p className="text-sm text-muted-foreground">{format(sheet.date, "PPP")}</p>
                                    </CardContent>
                                     <CardFooter className="p-2 pt-0 mt-auto border-t" onClick={() => handleOpenSheet(sheet)}>
                                        <Button variant="ghost" className="w-full h-8">Open</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

              </div>
            )}
          </TabsContent>
          <TabsContent value="clients">
            <ClientsManager 
              clients={clients} 
              accounts={accounts}
              onAddClient={addClient} 
              onUpdateClient={updateClient} 
              onDeleteClient={deleteClient}
              onClientTransaction={handleClientTransaction}
              onClearClientData={clearClientData}
            />
          </TabsContent>
          <TabsContent value="accounts">
            <AccountsManager accounts={accounts} clients={clients} setAccounts={setAccounts} />
          </TabsContent>
           <TabsContent value="ledger-record">
            <LedgerRecord clients={clients} savedSheetLog={savedSheetLog} draws={draws} declaredNumbers={declaredNumbers} />
          </TabsContent>
          <TabsContent value="admin-panel">
            <AdminPanel userId={user?.uid} clients={clients} savedSheetLog={savedSheetLog} />
          </TabsContent>
        </Tabs>
      </main>

       <Dialog open={declarationDialogOpen} onOpenChange={setDeclarationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Result for Draw {declarationDraw}</DialogTitle>
          </DialogHeader>
          <div className="my-4 text-center">
            <p className="text-lg">Are you sure you want to declare the number <strong className="text-primary">{declarationNumber}</strong>?</p>
            <p className="text-sm text-muted-foreground">This will finalize calculations for this draw.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleUndeclare} variant="destructive">Undeclare</Button>
            <Button onClick={handleDeclareOrUndeclare}>Declare</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!drawToDelete} onOpenChange={() => setDrawToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all saved sheets for draw <strong className="font-bold">{drawToDelete?.draw}</strong> on <strong className="font-bold">{drawToDelete ? format(drawToDelete.date, 'PPP') : ''}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDrawSheets}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    