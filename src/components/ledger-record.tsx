
"use client"
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client } from './clients-manager';
import type { SavedSheetInfo } from '@/app/page';
import { formatNumber } from "@/lib/utils";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type LedgerRecordProps = {
  clients: Client[];
  accounts: Account[];
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  draws: string[];
  declaredNumbers: { [draw: string]: string };
};

type Account = {
  id: string;
  clientName: string;
  balance: string;
  draws?: { [key: string]: { totalAmount: number; passingAmount: number } };
};

type DailyReportRow = {
  date: Date;
  clientPayable: number;
  upperPayable: number;
  brokerProfit: number;
};

const defaultClientComm = 10;
const defaultUpperComm = 20;
const defaultClientPair = 90;
const defaultUpperPair = 80;

type PerformanceRecord = {
  clientName: string;
  drawName: string;
  totalInvested: number;
  profitLoss: number;
};

const BrokerProfitLoss = ({ clients, savedSheetLog, declaredNumbers }: {
    clients: Client[];
    savedSheetLog: { [draw: string]: SavedSheetInfo[] };
    declaredNumbers: { [draw: string]: string };
}) => {
    const [upperComm, setUpperComm] = useState(defaultUpperComm.toString());
    const [upperPair, setUpperPair] = useState(defaultUpperPair.toString());
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    
    const dailyReportData: DailyReportRow[] = useMemo(() => {
        const upperCommPercent = parseFloat(upperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(upperPair) || defaultUpperPair;
    
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        const clientsToProcess = selectedClientId === 'all' ? clients : clients.filter(c => c.id === selectedClientId);
    
        return daysInMonth.map(day => {
            let totalClientPayableForDay = 0;
            let totalUpperPayableForDay = 0;
    
            clientsToProcess.forEach(client => {
                let clientGameTotalForDay = 0;
                let clientPassingAmountForDay = 0;
                const clientCommPercent = parseFloat(client.comm) / 100 || defaultClientComm / 100;
                const clientPairRate = parseFloat(client.pair) || defaultClientPair;

                Object.entries(savedSheetLog).forEach(([drawName, logs]) => {
                    const clientLogsForDraw = logs.filter(log => log.clientId === client.id && isSameDay(new Date(log.date), day));
                    clientLogsForDraw.forEach(log => {
                        clientGameTotalForDay += log.gameTotal;
                        const declaredNumber = declaredNumbers[drawName];
                        if (declaredNumber && log.data[declaredNumber]) {
                            clientPassingAmountForDay += parseFloat(log.data[declaredNumber]) || 0;
                        }
                    });
                });

                if (clientGameTotalForDay > 0) {
                    const clientCommission = clientGameTotalForDay * clientCommPercent;
                    const clientNet = clientGameTotalForDay - clientCommission;
                    const clientWinnings = clientPassingAmountForDay * clientPairRate;
                    const clientPayable = clientNet - clientWinnings;
                    totalClientPayableForDay += clientPayable;
                }
            });

            let totalGameAmountForDay = 0;
            let totalPassingAmountForDay = 0;

            Object.entries(savedSheetLog).forEach(([drawName, logs]) => {
                logs.forEach(log => {
                    const clientMatches = selectedClientId === 'all' || log.clientId === selectedClientId;
                    if (clientMatches && isSameDay(new Date(log.date), day)) {
                        totalGameAmountForDay += log.gameTotal;
                        const declaredNumber = declaredNumbers[drawName];
                        if (declaredNumber && log.data[declaredNumber]) {
                           totalPassingAmountForDay += parseFloat(log.data[declaredNumber]) || 0;
                        }
                    }
                });
            });
    
            const upperCommission = totalGameAmountForDay * upperCommPercent;
            const upperNet = totalGameAmountForDay - upperCommission;
            const upperWinnings = totalPassingAmountForDay * upperPairRate;
            totalUpperPayableForDay = upperNet - upperWinnings;
            
            const brokerProfit = totalClientPayableForDay - totalUpperPayableForDay;
            
            return {
                date: day,
                clientPayable: totalClientPayableForDay,
                upperPayable: totalUpperPayableForDay,
                brokerProfit,
            };
        });
    
    }, [selectedMonth, upperComm, upperPair, clients, savedSheetLog, declaredNumbers, selectedClientId]);
  
    const monthlyTotalProfit = useMemo(() => {
      return dailyReportData.reduce((acc, row) => acc + row.brokerProfit, 0);
    }, [dailyReportData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                    <Label htmlFor="upper-comm">Upper Broker Comm (%)</Label>
                    <Input 
                    id="upper-comm" 
                    value={upperComm} 
                    onChange={(e) => setUpperComm(e.target.value)} 
                    placeholder={String(defaultUpperComm)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="upper-pair">Upper Broker Pair Rate</Label>
                    <Input 
                    id="upper-pair" 
                    value={upperPair} 
                    onChange={(e) => setUpperPair(e.target.value)} 
                    placeholder={String(defaultUpperPair)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Select Month</Label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedMonth && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Pick a month</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={selectedMonth}
                        onSelect={(date) => date && setSelectedMonth(date)}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={2020}
                        toYear={new Date().getFullYear() + 1}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label>Filter by Client</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${monthlyTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {monthlyTotalProfit >= 0 ? `+₹${formatNumber(monthlyTotalProfit)}` : `-₹${formatNumber(Math.abs(monthlyTotalProfit))}`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total profit for {format(selectedMonth, "MMMM yyyy")}
                    </p>
                </CardContent>
            </Card>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Client Payable</TableHead>
                        <TableHead className="text-right">Upper Payable</TableHead>
                        <TableHead className="text-right">Broker Profit/Loss</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {dailyReportData.map((row, index) => (
                        <TableRow key={index} className={row.brokerProfit === 0 && row.clientPayable === 0 ? "text-muted-foreground" : ""}>
                        <TableCell className="font-medium">{format(row.date, "EEE, dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">₹{formatNumber(row.clientPayable)}</TableCell>
                        <TableCell className="text-right">₹{formatNumber(row.upperPayable)}</TableCell>
                        <TableCell className={`text-right font-bold ${row.brokerProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.brokerProfit >= 0 ? `+₹${formatNumber(row.brokerProfit)}` : `-₹${formatNumber(Math.abs(row.brokerProfit))}`}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                    <TableFooter>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell colSpan={3} className="font-bold text-lg text-right">Total Monthly Profit</TableCell>
                        <TableCell className={`text-right font-bold text-lg ${monthlyTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {monthlyTotalProfit >= 0 ? `+₹${formatNumber(monthlyTotalProfit)}` : `-₹${formatNumber(Math.abs(monthlyTotalProfit))}`}
                        </TableCell>
                    </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
};

const ClientProfitLoss = ({ clients, savedSheetLog, draws, declaredNumbers, accounts }: LedgerRecordProps) => {
    const [selectedClient, setSelectedClient] = useState<string>("all");
    const [selectedDraw, setSelectedDraw] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const performanceData: PerformanceRecord[] = useMemo(() => {
        const clientDrawMap: { [key: string]: { totalInvested: number, profitLoss: number } } = {};

        // Iterate over each draw and its logs
        Object.entries(savedSheetLog).forEach(([drawName, logs]) => {
            // Filter logs by selected draw if not 'all'
            if (selectedDraw !== 'all' && drawName !== selectedDraw) return;
            
            let filteredLogs = logs;
            const now = new Date();
            if (dateRange === 'today') {
                filteredLogs = logs.filter(log => isSameDay(new Date(log.date), now));
            } else if (dateRange === 'yesterday') {
                filteredLogs = logs.filter(log => isSameDay(new Date(log.date), subDays(now, 1)));
            } else if (dateRange === 'last7') {
                const sevenDaysAgo = subDays(now, 7);
                filteredLogs = logs.filter(log => new Date(log.date) >= sevenDaysAgo);
            }

            filteredLogs.forEach(log => {
                const client = clients.find(c => c.id === log.clientId);
                if (!client) return;

                if (searchQuery && !client.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return;
                }
                
                if (selectedClient !== 'all' && log.clientId !== selectedClient) return;

                const mapKey = `${client.id}-${drawName}`;

                if (!clientDrawMap[mapKey]) {
                    clientDrawMap[mapKey] = { totalInvested: 0, profitLoss: 0 };
                }

                const totalInvested = log.gameTotal;
                const clientComm = totalInvested * (parseFloat(client.comm) / 100);
                const clientNet = totalInvested - clientComm;

                const declaredNumber = declaredNumbers[drawName];
                const passingAmount = (declaredNumber && log.data[declaredNumber]) ? (parseFloat(log.data[declaredNumber]) || 0) : 0;
                const clientWinnings = passingAmount * (parseFloat(client.pair) || defaultClientPair);

                const profitLoss = clientNet - clientWinnings; // For broker: what they take in minus what they pay out

                clientDrawMap[mapKey].totalInvested += totalInvested;
                clientDrawMap[mapKey].profitLoss += profitLoss;
            });
        });

        const allPerformance = Object.keys(clientDrawMap).map(key => {
            const [clientId, drawName] = key.split('-');
            const client = clients.find(c => c.id === clientId);
            return {
                clientName: client?.name || 'Unknown',
                drawName,
                totalInvested: clientDrawMap[key].totalInvested,
                // For client P/L, we invert the broker's profit
                profitLoss: -clientDrawMap[key].profitLoss,
            };
        });

        return allPerformance.sort((a, b) => a.profitLoss - b.profitLoss);

    }, [clients, savedSheetLog, selectedClient, selectedDraw, dateRange, searchQuery, declaredNumbers]);
    
    const overallTotalInvested = useMemo(() => {
        return performanceData.reduce((acc, record) => acc + record.totalInvested, 0);
    }, [performanceData]);

    const overallTotalProfitLoss = useMemo(() => {
        return performanceData.reduce((acc, record) => acc + record.profitLoss, 0);
    }, [performanceData]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                    <Label>Filter by Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Filter by Draw</Label>
                    <Select value={selectedDraw} onValueChange={setSelectedDraw}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Draws</SelectItem>
                            {draws.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Filter by Date</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="last7">Last 7 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client-search">Search by Client Name</Label>
                    <Input
                        id="client-search"
                        placeholder="Enter client name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Draw Name</TableHead>
                            <TableHead className="text-right">Total Invested</TableHead>
                            <TableHead className="text-right">Client Profit/Loss</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {performanceData.length > 0 ? performanceData.map((record, index) => (
                            <TableRow key={index}>
                                <TableCell>{record.clientName}</TableCell>
                                <TableCell>{record.drawName}</TableCell>
                                <TableCell className="text-right">₹{formatNumber(record.totalInvested)}</TableCell>
                                <TableCell className={`text-right font-bold ${record.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {record.profitLoss >= 0 ? `+₹${formatNumber(record.profitLoss)}` : `-₹${formatNumber(Math.abs(record.profitLoss))}`}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    No data available for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-muted/50 hover:bg-muted">
                            <TableCell colSpan={2} className="font-bold text-lg text-right">Overall Totals</TableCell>
                            <TableCell className="text-right font-bold text-lg">₹{formatNumber(overallTotalInvested)}</TableCell>
                            <TableCell className={`text-right font-bold text-lg ${overallTotalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {overallTotalProfitLoss >= 0 ? `+₹${formatNumber(overallTotalProfitLoss)}` : `-₹${formatNumber(Math.abs(overallTotalProfitLoss))}`}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}

type ClientDailyBalance = {
    date: Date;
    openingBalance: number;
    todaysNet: number;
    closingBalance: number;
};

const ClientNetBalance = ({ clients, accounts, savedSheetLog, declaredNumbers }: LedgerRecordProps) => {
    const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

    const clientNetBalanceData: ClientDailyBalance[] = useMemo(() => {
        if (!selectedClientId) return [];

        const client = clients.find(c => c.id === selectedClientId);
        const account = accounts.find(a => a.id === selectedClientId);
        if (!client || !account) return [];
        
        const clientCommPercent = parseFloat(client.comm) / 100 || defaultClientComm / 100;
        const clientPairRate = parseFloat(client.pair) || defaultClientPair;

        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Note: This is a simplified calculation. A real-world scenario would need to fetch historical running balances.
        // For this implementation, we start from the client's 'activeBalance' at the beginning of the month.
        let runningBalance = parseFloat(client.activeBalance) || 0;
        const dailyBalances: ClientDailyBalance[] = [];

        daysInMonth.forEach(day => {
            const openingBalance = runningBalance;
            
            let clientGameTotalForDay = 0;
            let clientPassingAmountForDay = 0;

            Object.entries(savedSheetLog).forEach(([drawName, logs]) => {
                const clientLogsForDay = logs.filter(log => log.clientId === selectedClientId && isSameDay(new Date(log.date), day));
                clientLogsForDay.forEach(log => {
                    clientGameTotalForDay += log.gameTotal;
                    const declaredNumber = declaredNumbers[drawName];
                    if (declaredNumber && log.data[declaredNumber]) {
                        clientPassingAmountForDay += parseFloat(log.data[declaredNumber]) || 0;
                    }
                });
            });
            
            const clientCommission = clientGameTotalForDay * clientCommPercent;
            const clientNetFromGames = clientGameTotalForDay - clientCommission;
            const clientWinnings = clientPassingAmountForDay * clientPairRate;
            
            // From the client's perspective, this is their P/L for the day.
            // A positive value means they won, a negative value means they lost.
            const todaysClientPL = clientWinnings - clientNetFromGames;
            
            // The running balance is what the broker owes the client.
            // If the client wins, the broker owes them more. If the client loses, the broker owes them less.
            runningBalance += todaysClientPL;

            dailyBalances.push({
                date: day,
                openingBalance: openingBalance,
                todaysNet: todaysClientPL,
                closingBalance: runningBalance,
            });
        });

        return dailyBalances;

    }, [selectedClientId, selectedMonth, clients, accounts, savedSheetLog, declaredNumbers]);

    const currentClient = clients.find(c => c.id === selectedClientId);
    const finalBalance = clientNetBalanceData[clientNetBalanceData.length - 1]?.closingBalance ?? (currentClient ? parseFloat(currentClient.activeBalance) : 0);

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                    <Label>Select Client</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Select Month</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !selectedMonth && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Pick a month</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={selectedMonth}
                            onSelect={(date) => date && setSelectedMonth(date)}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={2020}
                            toYear={new Date().getFullYear() + 1}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {selectedClientId && (
                <>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Final Balance for {currentClient?.name}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {finalBalance >= 0 ? `You Owe: ₹${formatNumber(finalBalance)}` : `Client Owes: ₹${formatNumber(Math.abs(finalBalance))}`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            As of {format(new Date(), "PPP")}
                        </p>
                    </CardContent>
                </Card>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Opening Balance</TableHead>
                                <TableHead className="text-right">Today's Net (P/L)</TableHead>
                                <TableHead className="text-right">Closing Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientNetBalanceData.map((row, index) => (
                                <TableRow key={index} className={row.todaysNet === 0 ? "text-muted-foreground" : ""}>
                                    <TableCell className="font-medium">{format(row.date, "EEE, dd MMM")}</TableCell>
                                    <TableCell className={`text-right ${row.openingBalance < 0 ? 'text-red-500' : ''}`}>₹{formatNumber(row.openingBalance)}</TableCell>
                                    <TableCell className={`text-right font-bold ${row.todaysNet > 0 ? 'text-green-500' : row.todaysNet < 0 ? 'text-red-500' : ''}`}>
                                       {row.todaysNet > 0 ? `+₹${formatNumber(row.todaysNet)}` : row.todaysNet < 0 ? `-₹${formatNumber(Math.abs(row.todaysNet))}` : '₹0'}
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${row.closingBalance < 0 ? 'text-red-500' : ''}`}>₹{formatNumber(row.closingBalance)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                </>
            )}
        </div>
    );
};


export default function LedgerRecord({ clients, accounts, savedSheetLog, draws, declaredNumbers }: LedgerRecordProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Ledger Records</CardTitle>
        <CardDescription>Analyze brokerage and client performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="broker-pl">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="broker-pl">Broker P/L</TabsTrigger>
                <TabsTrigger value="client-pl">Client P/L</TabsTrigger>
                <TabsTrigger value="client-balance">Client Net Balance</TabsTrigger>
            </TabsList>
            <TabsContent value="broker-pl" className="pt-4">
                <BrokerProfitLoss clients={clients} savedSheetLog={savedSheetLog} declaredNumbers={declaredNumbers} />
            </TabsContent>
            <TabsContent value="client-pl" className="pt-4">
                <ClientProfitLoss clients={clients} accounts={accounts} savedSheetLog={savedSheetLog} draws={draws} declaredNumbers={declaredNumbers} />
            </TabsContent>
            <TabsContent value="client-balance" className="pt-4">
                <ClientNetBalance clients={clients} accounts={accounts} savedSheetLog={savedSheetLog} draws={draws} declaredNumbers={declaredNumbers} />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
