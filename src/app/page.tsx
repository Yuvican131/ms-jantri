
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager from "@/components/clients-manager"
import AccountsManager, { Account, DrawData } from "@/components/accounts-manager"
import LedgerRecord from "@/components/ledger-record"
import AdminPanel from "@/components/admin-panel"
import { Users, Building, ArrowLeft, Calendar as CalendarIcon, History, FileSpreadsheet, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays, isSameDay, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useClients } from "@/hooks/useClients"
import { useSheetLog, type SavedSheetInfo } from "@/hooks/useSheetLog"
import { useDeclaredNumbers } from "@/hooks/useDeclaredNumbers"
import type { Client } from "@/hooks/useClients"
import { useUser } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase"
import { useAuth } from "@/firebase"

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

export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void; clearSheet: () => void; getClientData: (clientId: string) => any, getClientCurrentData: (clientId: string) => any | undefined, getClientPreviousData: (clientId: string) => any | undefined }>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ draw: string; date: Date } | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [lastEntry, setLastEntry] = useState('');
  const [isLastEntryDialogOpen, setIsLastEntryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sheet");

  const [declarationDialogOpen, setDeclarationDialogOpen] = useState(false);
  const [declarationDraw, setDeclarationDraw] = useState("");
  const [declarationNumber, setDeclarationNumber] = useState("");
  const { toast } = useToast();
  
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const { clients, addClient, updateClient, deleteClient, handleClientTransaction, clearClientData } = useClients(user?.uid);
  const { savedSheetLog, addSheetLogEntry } = useSheetLog(user?.uid);
  const { declaredNumbers, setDeclaredNumber, removeDeclaredNumber, getDeclaredNumber, setDeclaredNumberLocal } = useDeclaredNumbers(user?.uid);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDate(new Date());
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const updateAccountsFromLog = useCallback(() => {
    const selectedDate = date || new Date();
    const allLogs = Object.values(savedSheetLog).flat();

    const newAccounts = clients.map(client => {
        const clientCommissionPercent = parseFloat(client.comm) / 100;
        const passingMultiplier = parseFloat(client.pair) || 80;
        
        let runningBalance = client.activeBalance || 0;
        
        const allLogsForClient = allLogs.filter(log => log.clientId === client.id).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

        allLogsForClient.forEach(log => {
            const logDate = parseISO(log.date);
            const declaredNumberForLogDate = getDeclaredNumber(log.draw, logDate);
            
            const passingAmountInLog = declaredNumberForLogDate ? parseFloat(log.data[declaredNumberForLogDate] || "0") : 0;
            
            const gameTotal = log.gameTotal;
            const commission = gameTotal * clientCommissionPercent;
            const netFromGames = gameTotal - commission;
            const winnings = passingAmountInLog * passingMultiplier;
            const netResultForLog = netFromGames - winnings;

            runningBalance += netResultForLog;
        });

        // Calculate details for the selected day for UI display
        const updatedDrawsForSelectedDay: { [key: string]: DrawData } = {};
        draws.forEach(drawName => {
            const drawLogs = savedSheetLog[drawName] || [];
            const clientLogForSelectedDay = drawLogs.find(log =>
                log.clientId === client.id &&
                isSameDay(parseISO(log.date), selectedDate)
            );

            const totalAmount = clientLogForSelectedDay?.gameTotal || 0;
            
            const declaredNumberForSelectedDay = getDeclaredNumber(drawName, selectedDate);
            const passingAmount = declaredNumberForSelectedDay && clientLogForSelectedDay
                ? parseFloat(clientLogForSelectedDay.data[declaredNumberForSelectedDay] || "0")
                : 0;

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
}, [clients, savedSheetLog, declaredNumbers, date]);


  useEffect(() => {
    updateAccountsFromLog();
  }, [updateAccountsFromLog]);


  const handleClientUpdateForSheet = (client: Client) => {
    if (gridSheetRef.current) {
      gridSheetRef.current.handleClientUpdate(client);
    }
  };
  
  const handleSelectDraw = (draw: string) => {
    if (date) {
      setSelectedInfo({ draw, date });
    }
  };

  const handleBackToDraws = () => {
    setSelectedInfo(null);
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
    if (declarationNumber.length === 2 && date) {
      setDeclaredNumber(declarationDraw, declarationNumber, date);
      toast({ title: "Success", description: `Result processed for draw ${declarationDraw}.` });
    }
    setDeclarationDialogOpen(false);
  };
  
  const handleUndeclare = () => {
    if (date) {
      removeDeclaredNumber(declarationDraw, date);
      toast({ title: "Success", description: `Result undeclared for draw ${declarationDraw}.` });
    }
    setDeclarationDialogOpen(false);
  };
  

  if (isUserLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <main className="flex-1 p-2 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center">
              <TabsList className="grid grid-cols-5 md:w-auto p-0.5 gap-0.5">
                <TabsTrigger value="sheet" className="gap-1 rounded-sm">
                  <GridIcon className="h-4 w-4" />
                  Home
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-1 rounded-sm">
                  <Users className="h-4 w-4" />
                  CLIENTS
                </TabsTrigger>
                <TabsTrigger value="accounts" className="gap-1 rounded-sm">
                  <Building className="h-4 w-4" />
                  ACCOUNT LEDGER
                </TabsTrigger>
                <TabsTrigger value="ledger-record" className="gap-1 rounded-sm">
                  <FileSpreadsheet className="h-4 w-4" />
                  Client Performance
                </TabsTrigger>
                <TabsTrigger value="admin-panel" className="gap-1 rounded-sm">
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </TabsTrigger>
              </TabsList>
               {selectedInfo && activeTab === 'sheet' && (
                 <div className="flex items-center">
                    <Button onClick={handleBackToDraws} variant="ghost" className="ml-2">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Draws
                    </Button>
                    <Button onClick={() => setIsLastEntryDialogOpen(true)} variant="outline" size="sm" className="ml-2">
                        <History className="mr-2 h-4 w-4" />
                        Last Entry
                    </Button>
                </div>
              )}
            </div>
          </div>
          <TabsContent value="sheet" className="flex-1 flex flex-col min-h-0">
            {selectedInfo && date ? (
              <GridSheet 
                ref={gridSheetRef} 
                draw={selectedInfo.draw} 
                date={date} 
                lastEntry={lastEntry} 
                setLastEntry={setLastEntry} 
                isLastEntryDialogOpen={isLastEntryDialogOpen} 
                setIsLastEntryDialogOpen={setIsLastEntryDialogOpen}
                clients={clients}
                onClientSheetSave={handleClientSheetSave}
                savedSheetLog={savedSheetLog[selectedInfo.draw] || []}
                accounts={accounts}
                draws={draws}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Date and Draw</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => d && setDate(d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
                    {draws.map((draw) => {
                      const declaredNumberForDate = getDeclaredNumber(draw, date) || '';

                      return (
                      <div key={draw} className="flex flex-col gap-1">
                          <Button onClick={() => handleSelectDraw(draw)} className="h-16 sm:h-20 text-lg sm:text-xl font-bold bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg">
                            {draw}
                          </Button>
                           <Input
                              type="text"
                              placeholder="00"
                              className="w-full h-8 text-center"
                              maxLength={2}
                              value={declaredNumberForDate}
                              onChange={(e) => {
                                if (date) handleDeclarationInputChange(draw, e.target.value, date);
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && date) {
                                      const inputElement = e.target as HTMLInputElement;
                                      if(inputElement.value.length === 2) {
                                        handleDeclarationInputChange(draw, inputElement.value, date);
                                      }
                                  }
                              }}
                          />
                      </div>
                    )})}
                  </div>
                </CardContent>
              </Card>
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
            <AdminPanel accounts={accounts} clients={clients} savedSheetLog={savedSheetLog} declaredNumbers={declaredNumbers} />
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
    </div>
  );
}

    

    