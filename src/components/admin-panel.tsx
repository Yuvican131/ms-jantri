
"use client"
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, HandCoins, Landmark, CircleDollarSign, Trophy, Wallet, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import type { Account } from "./accounts-manager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import type { Client } from '@/hooks/useClients';
import type { SavedSheetInfo } from '@/hooks/useSheetLog';
import type { DeclaredNumber } from '@/hooks/useDeclaredNumbers';


const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];
const defaultClientComm = 10;
const defaultUpperComm = 20;
const defaultClientPair = 90;
const defaultUpperPair = 80;

type DailyReportRow = {
  date: Date;
  clientPayable: number;
  upperPayable: number;
  brokerProfit: number;
};

const BrokerDrawSummaryCard = ({ 
    title, 
    rawTotal, 
    passingTotal,
    upperPairRate
}: { 
    title: string; 
    rawTotal: number; 
    passingTotal: number;
    upperPairRate: number;
}) => {
    return (
        <Card className="flex flex-col bg-muted/30">
            <div className="p-3 flex-grow">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                    <HandCoins className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-right text-foreground">{formatNumber(rawTotal)}</p>
            </div>
            <div className="p-2 bg-muted/50 border-t flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Passing</span>
                <span className="text-sm font-bold">{formatNumber(passingTotal * upperPairRate)}</span>
            </div>
        </Card>
    );
};

const GrandTotalSummaryCard = ({ 
    title, 
    finalValue,
    grandRawTotal,
    grandPassingTotal
}: { 
    title: string; 
    finalValue: number;
    grandRawTotal: number;
    grandPassingTotal: number;
}) => {
    const valueColor = finalValue >= 0 ? 'text-green-400' : 'text-red-500';
    return (
        <Card className="flex flex-col justify-center p-3 bg-primary/10 border-primary/50 col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1">
             <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-primary">{title}</h4>
                <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2 text-right">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><CircleDollarSign className="h-3 w-3"/> Total Raw</span>
                    <span className="font-semibold">{formatNumber(grandRawTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3"/> Total Passing</span>
                     <span className="font-semibold">{formatNumber(grandPassingTotal)}</span>
                </div>
                <Separator className="my-1 bg-border/50" />
                <div className="flex justify-between items-center">
                    <span className="font-bold text-base">Final Net</span>
                    <p className={`text-2xl font-bold ${valueColor}`}>{formatNumber(finalValue)}</p>
                </div>
            </div>
        </Card>
    )
}

const BrokerProfitLoss = ({ clients, savedSheetLog, declaredNumbers }: {
    clients: Client[];
    savedSheetLog: { [draw: string]: SavedSheetInfo[] };
    declaredNumbers: { [key: string]: DeclaredNumber };
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
                    const clientLogsForDraw = logs.filter(log => log.clientId === client.id && isSameDay(parseISO(log.date), day));
                    clientLogsForDraw.forEach(log => {
                        clientGameTotalForDay += log.gameTotal;
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const declarationId = `${drawName}-${dateStr}`;
                        const declaredNumber = declaredNumbers[declarationId]?.number;

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
            const dateStr = format(day, 'yyyy-MM-dd');

            Object.entries(savedSheetLog).forEach(([drawName, logs]) => {
                logs.forEach(log => {
                    const clientMatches = selectedClientId === 'all' || log.clientId === selectedClientId;
                    if (clientMatches && isSameDay(parseISO(log.date), day)) {
                        totalGameAmountForDay += log.gameTotal;
                        const declarationId = `${drawName}-${dateStr}`;
                        const declaredNumber = declaredNumbers[declarationId]?.number;

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


type AdminPanelProps = {
  accounts: Account[];
  clients: Client[];
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  declaredNumbers: { [key: string]: DeclaredNumber };
};


export default function AdminPanel({ accounts, clients, savedSheetLog, declaredNumbers }: AdminPanelProps) {
    const [upperComm, setUpperComm] = useState(defaultUpperComm.toString());
    const [upperPair, setUpperPair] = useState(defaultUpperPair.toString());

    const { brokerRawDrawTotals, brokerPassingDrawTotals, grandRawTotal, grandPassingTotal } = useMemo(() => {
        const rawTotals: { [key: string]: number } = {};
        const passingTotals: { [key: string]: number } = {};
        const allLogs = Object.values(savedSheetLog).flat();

        for (const drawName of draws) {
            rawTotals[drawName] = 0;
            passingTotals[drawName] = 0;
        }

        allLogs.forEach(log => {
            rawTotals[log.draw] = (rawTotals[log.draw] || 0) + log.gameTotal;

            const dateStr = parseISO(log.date).toISOString().split('T')[0];
            const declarationId = `${log.draw}-${dateStr}`;
            const declaredNum = declaredNumbers[declarationId]?.number;

            if (declaredNum && log.data[declaredNum]) {
                const passingAmount = parseFloat(log.data[declaredNum] || "0");
                passingTotals[log.draw] = (passingTotals[log.draw] || 0) + passingAmount;
            }
        });
        
        const grandRaw = Object.values(rawTotals).reduce((sum, total) => sum + total, 0);
        const grandPassing = Object.values(passingTotals).reduce((sum, total) => sum + total, 0);

        return { 
            brokerRawDrawTotals: rawTotals, 
            brokerPassingDrawTotals: passingTotals,
            grandRawTotal: grandRaw,
            grandPassingTotal: grandPassing,
        };
    }, [savedSheetLog, declaredNumbers]);

    const finalNetTotalForBroker = useMemo(() => {
        let totalFromClients = 0;
        const allLogs = Object.values(savedSheetLog).flat();
    
        clients.forEach(client => {
            const clientCommPercent = parseFloat(client.comm) / 100 || defaultClientComm / 100;
            const clientPairRate = parseFloat(client.pair) || defaultClientPair;
    
            const clientLogs = allLogs.filter(log => log.clientId === client.id);
            
            let clientTotalGame = 0;
            let clientTotalPassingAmount = 0;

            clientLogs.forEach(log => {
                clientTotalGame += log.gameTotal;
                const dateStr = parseISO(log.date).toISOString().split('T')[0];
                const declarationId = `${log.draw}-${dateStr}`;
                const declaredNumber = declaredNumbers[declarationId]?.number;
                
                if (declaredNumber && log.data[declaredNumber]) {
                    clientTotalPassingAmount += parseFloat(log.data[declaredNumber]) || 0;
                }
            });

            const clientNet = clientTotalGame * (1 - clientCommPercent);
            const clientWinnings = clientTotalPassingAmount * clientPairRate;
            totalFromClients += (clientNet - clientWinnings);
        });

        const upperCommPercent = parseFloat(upperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(upperPair) || defaultUpperPair;

        const brokerNet = grandRawTotal * (1 - upperCommPercent);
        const brokerWinningsPaid = grandPassingTotal * upperPairRate;
        const brokerCost = brokerNet - brokerWinningsPaid;

        return totalFromClients - brokerCost;

    }, [clients, savedSheetLog, declaredNumbers, grandRawTotal, grandPassingTotal, upperComm, upperPair]);

    const upperPairRateValue = parseFloat(upperPair) || defaultUpperPair;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
        <CardDescription>High-level overview of your brokerage operations.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-8 overflow-y-auto">
        <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <Landmark className="h-5 w-5" /> All Draws Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {draws.map(drawName => (
                    <BrokerDrawSummaryCard 
                        key={drawName}
                        title={drawName} 
                        rawTotal={brokerRawDrawTotals[drawName] || 0} 
                        passingTotal={brokerPassingDrawTotals[drawName] || 0}
                        upperPairRate={upperPairRateValue}
                    />
                ))}
                <GrandTotalSummaryCard
                  title="Final Summary"
                  finalValue={finalNetTotalForBroker}
                  grandRawTotal={grandRawTotal}
                  grandPassingTotal={grandPassingTotal * upperPairRateValue}
                />
            </div>
        </div>
        <Separator />
        <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Broker Profit & Loss
            </h3>
             <BrokerProfitLoss clients={clients} savedSheetLog={savedSheetLog} declaredNumbers={declaredNumbers} />
        </div>
      </CardContent>
    </Card>
  );
}

    

    