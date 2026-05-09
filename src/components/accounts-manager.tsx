
"use client"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Client } from "@/hooks/useClients"
import { useToast } from "@/hooks/use-toast"
import { formatNumber } from "@/lib/utils"
import { ArrowUpRight, Calendar as CalendarIcon, ChevronLeft, ChevronRight, HandCoins, Search, CircleDollarSign, History, Plus, Save, Trash2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, subDays, addDays } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";


export type DrawData = {
  totalAmount: number;
  passingAmount: number;
  commission: number;
  patti: number;
  harupA: number;
  harupB: number;
}

export type Account = {
  id: string
  clientName: string
  balance: number
  openingBalance: number
  draws?: { [key: string]: DrawData }
}

type AccountsManagerProps = {
  accounts: Account[];
  clients: Client[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
  declaredNumbers?: any;
  getDeclaredNumber?: (draw: string, date: Date) => string | undefined;
};

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

export default function AccountsManager({
  accounts,
  clients,
  setAccounts,
  selectedDate,
  onSelectedDateChange,
  declaredNumbers,
  getDeclaredNumber,
}: AccountsManagerProps) {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>(() => accounts[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [jamaAmount, setJamaAmount] = useState('');
  const [lenaAmount, setLenaAmount] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [isSettlementHistoryOpen, setIsSettlementHistoryOpen] = useState(false);

  // Settlement history per account per date
  const [accountSettlements, setAccountSettlements] = useState<{ [accountId: string]: { [dateKey: string]: Array<{
    id: string;
    amount: number;
    reference: string;
    timestamp: string;
  }> } }>({});

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(a => a.clientName.toLowerCase().includes(q));
  }, [accounts, search]);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedClientId) ?? accounts[0], [accounts, selectedClientId]);
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedAccount?.id), [clients, selectedAccount?.id]);

  const totalPlayed = selectedAccount?.draws
    ? Object.values(selectedAccount.draws).reduce((sum, d) => sum + (d?.totalAmount || 0), 0)
    : 0;

  const balanceValue = selectedAccount?.balance || 0;

const getDrawLedgerRow = (drawName: string) => {
  const drawData = selectedAccount?.draws?.[drawName];
  const totalAmount = drawData?.totalAmount || 0;
  const passingAmount = drawData?.passingAmount || 0;
  const commission = drawData?.commission || 0;
  const patti = drawData?.patti || 0;
  const harupA = drawData?.harupA || 0;
  const harupB = drawData?.harupB || 0;
  
  // Get declared result for this draw
  const declaredResult = getDeclaredNumber ? getDeclaredNumber(drawName, selectedDate) : null;
  
  const commissionPercent = selectedClient ? parseFloat(selectedClient.comm) / 100 : 0.10;
  const passingMultiplier = selectedClient ? parseFloat(selectedClient.pair) : 90;
  const afterCommission = totalAmount - (totalAmount * commissionPercent);
  const passingTotal = passingAmount * passingMultiplier;
  const drawNet = afterCommission - passingTotal;

  let harupDisplay = '';
  if (harupA > 0 && harupB > 0) {
    harupDisplay = `A/B (${harupA} / ${harupB})`;
  } else if (harupA > 0) {
    harupDisplay = `A (${harupA})`;
  } else if (harupB > 0) {
    harupDisplay = `B (${harupB})`;
  }

return {
  totalAmount,
  passingAmount,
  commission,
  patti,
  harupA,
  harupB,
  harupDisplay,
  drawNet,
  declaredResult,
};
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" /> Client Accounts
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onSelectedDateChange(subDays(selectedDate, 1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-sm flex items-center justify-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(selectedDate, 'EEE, d MMM')}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onSelectedDateChange(addDays(selectedDate, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {filteredAccounts.map((a) => {
                const bal = a.balance || 0;
                const isSelected = a.id === selectedAccount?.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedClientId(a.id)}
                    className={[
                      "w-full text-left rounded-md border px-3 py-2 transition-colors",
                      isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.clientName}</div>
                      </div>
                      <div className={`font-bold tabular-nums ${bal >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        ₹{formatNumber(bal)}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredAccounts.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No matching clients.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="h-full flex flex-col overflow-hidden">
         <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
           <div className="min-w-0">
             <CardTitle className="truncate">{selectedAccount?.clientName ?? 'Select a client'}</CardTitle>
             <div className="text-sm text-muted-foreground">
               {selectedClient?.comm ? `${selectedClient.comm}% comm` : '—'}
             </div>
           </div>

           <div className="flex items-center gap-3 flex-1 justify-center">
             <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 min-w-[130px]">
               <div className="text-[10px] uppercase tracking-wide text-emerald-300/90 font-semibold">Opening</div>
               <div className="text-xl font-bold tabular-nums text-emerald-100">₹{formatNumber(selectedAccount?.openingBalance || 0)}</div>
             </div>
             <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 min-w-[130px]">
               <div className="text-[10px] uppercase tracking-wide text-sky-300/90 font-semibold">Gross</div>
               <div className="text-xl font-bold tabular-nums text-sky-100">₹{formatNumber(totalPlayed)}</div>
             </div>
             <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 min-w-[130px]">
               <div className="text-[10px] uppercase tracking-wide text-violet-300/90 font-semibold">Closing</div>
               <div className={`text-xl font-bold tabular-nums ${balanceValue >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                 ₹{formatNumber(balanceValue)}
               </div>
             </div>
           </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsSettlementHistoryOpen(true)} size="icon" className="h-9 w-9">
                <History className="h-4 w-4" />
              </Button>
              <Button onClick={() => setSettlementOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Record Settlement
              </Button>
            </div>
         </CardHeader>

         <CardContent className="flex-1 overflow-hidden">

          <div className="flex-1 min-h-0 rounded-xl border bg-card/50 overflow-hidden">
            {selectedAccount ? (
              <>
<div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] bg-muted/40 border-b text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
  <div className="px-4 py-2.5">
    Draw & Result
    <span className="ml-2 text-[10px]">({format(selectedDate, 'dd/MM/yyyy')})</span>
  </div>
  <div className="px-4 py-2.5 text-center">Total Played</div>
  <div className="px-4 py-2.5 text-center">Passing Pts</div>
  <div className="px-4 py-2.5 text-center">Commission</div>
  <div className="px-4 py-2.5 text-center">Harup</div>
  <div className="px-4 py-2.5 text-right">Draw Net</div>
                </div>

                <ScrollArea className="h-[calc(100%-48px)]">
                  {draws.map((draw) => {
const { totalAmount, passingAmount, commission, patti, harupDisplay, drawNet, declaredResult } = getDrawLedgerRow(draw);
                    const isProfit = drawNet >= 0;

                    return (
<div
  key={draw}
  className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] items-center border-b last:border-b-0"
>
                        <div className="px-4 py-3.5 flex items-center gap-3 text-xl font-semibold leading-none text-emerald-400">
                          {draw}
                          {declaredResult && (
                            <span className="text-base text-primary font-medium ml-2">
                              | {declaredResult}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3.5 text-center text-lg font-semibold tabular-nums">
                          ₹{formatNumber(totalAmount)}
                        </div>
<div className="px-4 py-3.5 text-center text-base font-medium tabular-nums text-muted-foreground">
  {formatNumber(passingAmount)} pts
</div>
<div className="px-4 py-3.5 text-center text-base font-medium tabular-nums text-muted-foreground">
  ₹{formatNumber(commission)}
</div>
<div className="px-4 py-3.5 text-center text-base font-medium tabular-nums text-amber-400">
  {harupDisplay || '—'}
</div>
<div
  className={`px-4 py-3.5 text-right text-xl font-bold tabular-nums inline-flex justify-end items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
>
  <ArrowUpRight className={`h-4 w-4 ${isProfit ? '' : 'rotate-90'}`} />
  ₹{formatNumber(Math.abs(drawNet))}
</div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a client to view details.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

       {/* Settlement Dialog */}
       <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Record Settlement</DialogTitle>
             <DialogDescription>
               Record payment settlement for {selectedAccount?.clientName} on {format(selectedDate, 'PPP')}
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-4 py-4">
             <div className="grid grid-cols-3 items-center gap-4">
               <Label htmlFor="jama-amount">Jama (Pay)</Label>
               <Input 
                 id="jama-amount" 
                 placeholder="Amount" 
                 value={jamaAmount} 
                 onChange={e => {setJamaAmount(e.target.value); setLenaAmount('');}} 
                 className="col-span-2 h-8" 
                 type="number"
               />
             </div>
             <div className="grid grid-cols-3 items-center gap-4">
               <Label htmlFor="lena-amount">Lena (Receive)</Label>
               <Input 
                 id="lena-amount" 
                 placeholder="Amount" 
                 value={lenaAmount} 
                 onChange={e => {setLenaAmount(e.target.value); setJamaAmount('');}} 
                 className="col-span-2 h-8"
                 type="number"
               />
             </div>
             <div className="grid grid-cols-3 items-center gap-4">
               <Label htmlFor="settlement-ref">Reference</Label>
               <Input 
                 id="settlement-ref" 
                 placeholder="e.g. Online/Cash" 
                 value={settlementReference} 
                 onChange={e => setSettlementReference(e.target.value)} 
                 className="col-span-2 h-8"
               />
             </div>
             <div className="grid grid-cols-3 items-center gap-4">
               <div className="col-start-2 col-span-2 text-sm text-muted-foreground">
                 Current Balance: <span className={balanceValue >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>₹{formatNumber(balanceValue)}</span>
               </div>
             </div>
           </div>
           <DialogFooter>
             <DialogClose asChild>
               <Button variant="secondary">Cancel</Button>
             </DialogClose>
             <Button
               onClick={() => {
                 const jama = parseFloat(jamaAmount) || 0;
                 const lena = parseFloat(lenaAmount) || 0;
                 
                 if (jama > 0 && lena > 0) {
                     toast({ title: "Invalid Entry", description: "Please enter a value in either Jama or Lena, not both.", variant: "destructive" });
                     return;
                 }
                 if (jama === 0 && lena === 0) {
                     toast({ title: "Invalid Entry", description: "Please enter an amount for Jama or Lena.", variant: "destructive" });
                     return;
                 }

                 const settlementChange = lena - jama;
                 const dateKey = format(selectedDate, 'yyyy-MM-dd');
                 
                 const newSettlement = {
                     id: new Date().toISOString(),
                     amount: settlementChange,
                     reference: settlementReference,
                     timestamp: new Date().toISOString()
                 };

                 // Save settlement history
                 setAccountSettlements(prev => {
                     const accountHistory = prev[selectedClientId] || {};
                     const daySettlements = accountHistory[dateKey] ? [...accountHistory[dateKey]] : [];
                     daySettlements.push(newSettlement);
                     return {
                         ...prev,
                         [selectedClientId]: {
                             ...accountHistory,
                             [dateKey]: daySettlements
                         }
                     };
                 });
                 
                 // Update account balance
                 setAccounts(prev => prev.map(acc => 
                   acc.id === selectedClientId 
                     ? { ...acc, balance: acc.balance + settlementChange }
                     : acc
                 ));
                 
                 toast({ 
                   title: "Settlement Recorded", 
                   description: `Settlement for ${selectedAccount?.clientName} has been updated.` 
                 });
                 
                 setJamaAmount('');
                 setLenaAmount('');
                 setSettlementReference('');
                 setSettlementOpen(false);
               }}
             >
               <Save className="mr-2 h-4 w-4" /> Save Settlement
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Settlement History Dialog */}
       <Dialog open={isSettlementHistoryOpen} onOpenChange={setIsSettlementHistoryOpen}>
           <DialogContent className="max-w-2xl">
               <DialogHeader>
                   <DialogTitle>Settlement History</DialogTitle>
                   <DialogDescription>Recorded settlements for {selectedAccount?.clientName} on {format(selectedDate, 'PPP')}</DialogDescription>
               </DialogHeader>
               <div className="my-4">
                   <ScrollArea className="max-h-[60vh]">
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Time</TableHead>
                                   <TableHead>Amount</TableHead>
                                   <TableHead>Reference</TableHead>
                                   <TableHead className="text-right">Action</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {(accountSettlements[selectedClientId]?.[format(selectedDate, 'yyyy-MM-dd')] || []).map(s => (
                                   <TableRow key={s.id}>
                                       <TableCell>{format(new Date(s.timestamp), 'p')}</TableCell>
                                       <TableCell className={`font-semibold ${s.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                           {s.amount > 0 ? `+${formatNumber(s.amount)}` : formatNumber(s.amount)}
                                       </TableCell>
                                       <TableCell>{s.reference}</TableCell>
                                       <TableCell className="text-right">
                                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                               const dateKey = format(selectedDate, 'yyyy-MM-dd');
                                               // Remove settlement and reverse balance
                                               setAccounts(prev => prev.map(acc => 
                                                 acc.id === selectedClientId 
                                                   ? { ...acc, balance: acc.balance - s.amount }
                                                   : acc
                                               ));
                                               setAccountSettlements(prev => {
                                                   const accountHistory = prev[selectedClientId] || {};
                                                   const daySettlements = accountHistory[dateKey] || [];
                                                   const newDaySettlements = daySettlements.filter(x => x.id !== s.id);
                                                   if (newDaySettlements.length > 0) {
                                                       return { 
                                                           ...prev, 
                                                           [selectedClientId]: {
                                                               ...accountHistory,
                                                               [dateKey]: newDaySettlements 
                                                           }
                                                       };
                                                   } else {
                                                       const newAccountHistory = { ...accountHistory };
                                                       delete newAccountHistory[dateKey];
                                                       return { 
                                                           ...prev, 
                                                           [selectedClientId]: newAccountHistory
                                                       };
                                                   }
                                               });
                                               toast({ title: "Settlement entry deleted." });
                                           }}>
                                               <Trash2 className="h-4 w-4" />
                                           </Button>
                                       </TableCell>
                                   </TableRow>
                               ))}
                               {(!accountSettlements[selectedClientId]?.[format(selectedDate, 'yyyy-MM-dd')] || accountSettlements[selectedClientId][format(selectedDate, 'yyyy-MM-dd')].length === 0) && (
                                   <TableRow>
                                       <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                           No settlements recorded for this date.
                                       </TableCell>
                                   </TableRow>
                               )}
                           </TableBody>
                       </Table>
                   </ScrollArea>
               </div>
               <DialogFooter>
                   <DialogClose asChild>
                       <Button type="button" variant="secondary">
                         Close
                       </Button>
                   </DialogClose>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  )
}

    