
"use client"
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, HandCoins, Landmark, CircleDollarSign, Trophy, Wallet, Calendar as CalendarIcon, Percent, Forward, TrendingUpIcon, TrendingDownIcon, Minus, Scale } from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getYear, getMonth, startOfYear, endOfYear, eachMonthOfInterval, startOfDay, endOfDay, subDays } from "date-fns";
import type { Client } from '@/hooks/useClients';
import type { SavedSheetInfo } from '@/hooks/useSheetLog';
import { useDeclaredNumbers, type DeclaredNumber } from '@/hooks/useDeclaredNumbers';
import { useToast } from "@/hooks/use-toast";


const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];
const defaultUpperComm = 20;
const defaultClientPair = 90;
const defaultUpperPair = 80;

type ReportRow = {
  label: string;
  date: Date;
  clientPayable: number;
  upperPayable: number;
  brokerProfit: number;
};

const BrokerDrawSummaryCard = ({ 
    title, 
    rawTotal, 
    passingTotal,
}: { 
    title: string; 
    rawTotal: number; 
    passingTotal: number;
}) => {
    return (
        <Card className="flex flex-col bg-muted/30 p-2 h-full">
            <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-base text-foreground">{title}</h4>
                    <HandCoins className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-right text-foreground">{formatNumber(rawTotal)}</p>
            </div>
            <div className="bg-muted/50 border-t flex items-center justify-between mt-2 pt-1.5">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Pass</span>
                <span className={`text-sm font-bold ${passingTotal > 0 ? 'text-red-500' : 'text-foreground'}`}>{formatNumber(passingTotal)}</span>
            </div>
        </Card>
    );
};

const GrandTotalSummaryCard = ({ 
    title, 
    finalValue,
    grandRawTotal,
    grandPassingTotal,
    brokerCommission,
    upperPairRate
}: { 
    title: string; 
    finalValue: number;
    grandRawTotal: number;
    grandPassingTotal: number;
    brokerCommission: number;
    upperPairRate: number;
}) => {
    const valueColor = finalValue >= 0 ? 'text-green-400' : 'text-red-500';
    const finalPassingTotal = grandPassingTotal * upperPairRate;
    return (
        <Card className="flex flex-col justify-center p-3 bg-primary/10 border-primary/50 h-full">
             <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-primary">{title}</h4>
                <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-right">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><CircleDollarSign className="h-3 w-3"/> Total Raw</span>
                    <span className="font-semibold">{formatNumber(grandRawTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3"/> Broker Comm</span>
                     <span className="font-semibold">{formatNumber(brokerCommission)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3"/> Total Passing</span>
                     <span className="font-semibold">{formatNumber(finalPassingTotal)}</span>
                </div>
                <Separator className="my-1 bg-border/50" />
                <div className="flex justify-between items-center">
                    <span className="font-bold">Final Net</span>
                    <p className={`text-xl font-bold ${valueColor}`}>{formatNumber(finalValue)}</p>
                </div>
            </div>
        </Card>
    )
}

const RunningTotalSummaryCard = ({
    runningTotal
}: {
    runningTotal: number;
}) => {
    const runningTotalColor = runningTotal >= 0 ? 'text-green-500' : 'text-red-500';

    return (
        <Card className="p-2 bg-muted/50 border-border">
            <div className="flex items-center justify-between px-1">
                <p className="text-xs text-foreground font-bold flex items-center gap-1"><Scale className="h-3 w-3"/>Running Net</p>
                <p className={`text-lg font-extrabold ${runningTotalColor}`}>{formatNumber(runningTotal)}</p>
            </div>
        </Card>
    );
};


const BrokerProfitLoss = ({ userId, clients, savedSheetLog, upperComm, setUpperComm, upperPair, setUpperPair, onApply, appliedUpperComm, appliedUpperPair, selectedDate, setSelectedDate }: {
    userId?: string;
    clients: Client[];
    savedSheetLog: { [draw: string]: SavedSheetInfo[] };
    upperComm: string;
    setUpperComm: (value: string) => void;
    upperPair: string;
    setUpperPair: (value: string) => void;
    onApply: () => void;
    appliedUpperComm: string;
    appliedUpperPair: string;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
}) => {
    const { declaredNumbers } = useDeclaredNumbers(userId);
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
    
    const reportData: ReportRow[] = useMemo(() => {
        const upperCommPercent = parseFloat(appliedUpperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
        const clientsToProcess = selectedClientId === 'all' ? clients : clients.filter(c => c.id === selectedClientId);

        const calculateProfitForPeriod = (periodStart: Date, periodEnd: Date): { clientPayable: number, upperPayable: number } => {
            let totalClientPayable = 0;
            let totalUpperPayable = 0;
            let totalGameAmount = 0;
            let totalPassingAmount = 0;
            const allLogs = Object.values(savedSheetLog).flat();

            clientsToProcess.forEach(client => {
                let clientGameTotalForPeriod = 0;
                let clientPassingAmountForPeriod = 0;
                const clientCommPercent = (client.comm && !isNaN(parseFloat(client.comm))) ? parseFloat(client.comm) / 100 : 0;
                const clientPairRate = parseFloat(client.pair) || defaultClientPair;
                
                const clientLogsForPeriod = allLogs.filter(log => {
                    const logDate = new Date(log.date);
                    return log.clientId === client.id && logDate >= periodStart && logDate <= periodEnd;
                });

                clientLogsForPeriod.forEach(log => {
                    clientGameTotalForPeriod += log.gameTotal;
                    const declaredNumber = declaredNumbers[`{log.draw}-{log.date}`]?.number;
                    if (declaredNumber && log.data[declaredNumber]) {
                        clientPassingAmountForPeriod += parseFloat(log.data[declaredNumber]) || 0;
                    }
                });
                
                if (clientGameTotalForPeriod > 0) {
                    const clientCommission = clientGameTotalForPeriod * clientCommPercent;
                    const clientNet = clientGameTotalForPeriod - clientCommission;
                    const clientWinnings = clientPassingAmountForPeriod * clientPairRate;
                    totalClientPayable += clientNet - clientWinnings;
                }
            });

            const relevantLogs = allLogs.filter(log => {
                 const logDate = new Date(log.date);
                 const clientMatches = selectedClientId === 'all' || log.clientId === selectedClientId;
                 return clientMatches && logDate >= periodStart && logDate <= periodEnd;
            });

            relevantLogs.forEach(log => {
                totalGameAmount += log.gameTotal;
                const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
                if (declaredNumber && log.data[declaredNumber]) {
                    totalPassingAmount += parseFloat(log.data[declaredNumber]) || 0;
                }
            });

            const upperCommission = totalGameAmount * upperCommPercent;
            const upperNet = totalGameAmount - upperCommission;
            const upperWinnings = totalPassingAmount * upperPairRate;
            totalUpperPayable = upperNet - upperWinnings;
            
            return { clientPayable: totalClientPayable, upperPayable: totalUpperPayable };
        };

        if (viewMode === 'month') {
            const monthStart = startOfMonth(selectedDate);
            const monthEnd = endOfMonth(selectedDate);
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
            return daysInMonth.map(day => {
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);
                const { clientPayable, upperPayable } = calculateProfitForPeriod(dayStart, dayEnd);
                return {
                    date: day,
                    label: format(day, "EEE, dd MMM yyyy"),
                    clientPayable,
                    upperPayable,
                    brokerProfit: clientPayable - upperPayable,
                };
            }).filter(row => row.clientPayable !== 0 || row.upperPayable !== 0);
        } else { // viewMode === 'year'
            const yearStart = startOfYear(selectedDate);
            const yearEnd = endOfYear(selectedDate);
            const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });

            return monthsInYear.map(month => {
                const monthStart = startOfMonth(month);
                const monthEnd = endOfMonth(month);
                const { clientPayable, upperPayable } = calculateProfitForPeriod(monthStart, monthEnd);
                return {
                    date: month,
                    label: format(month, "MMMM yyyy"),
                    clientPayable,
                    upperPayable,
                    brokerProfit: clientPayable - upperPayable,
                };
            }).filter(row => row.clientPayable !== 0 || row.upperPayable !== 0);
        }
    
    }, [selectedDate, appliedUpperComm, appliedUpperPair, clients, savedSheetLog, declaredNumbers, selectedClientId, viewMode]);
  
    const totalProfit = useMemo(() => {
      return reportData.reduce((acc, row) => acc + row.brokerProfit, 0);
    }, [reportData]);

    const grandTotalForPeriod = useMemo(() => {
        return reportData.reduce((acc, row) => {
            acc.clientPayable += row.clientPayable;
            acc.upperPayable += row.upperPayable;
            acc.brokerProfit += row.brokerProfit;
            return acc;
        }, { clientPayable: 0, upperPayable: 0, brokerProfit: 0 });
    }, [reportData]);

    const hasData = useMemo(() => reportData.some(row => row.clientPayable !== 0 || row.upperPayable !== 0), [reportData]);

    return (
        <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
                    <Button onClick={onApply}>Apply Settings</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>View By</Label>
                    <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'year')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                    </Select>
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
            
            {hasData ? (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {viewMode === 'month' ? 'Monthly' : 'Yearly'} Summary
                            </CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {totalProfit >= 0 ? `+₹{formatNumber(totalProfit)}` : `-₹{formatNumber(Math.abs(totalProfit))}`}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Total profit for {format(selectedDate, viewMode === 'month' ? "MMMM yyyy" : "yyyy")}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>{viewMode === 'month' ? 'Date' : 'Month'}</TableHead>
                                <TableHead className="text-right">Client Payable</TableHead>
                                <TableHead className="text-right">Upper Payable</TableHead>
                                <TableHead className="text-right">Broker Profit/Loss</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {reportData.map((row, index) => (
                                <TableRow key={index} className={row.brokerProfit === 0 && row.clientPayable === 0 ? "text-muted-foreground" : ""}>
                                <TableCell className="font-medium">{row.label}</TableCell>
                                <TableCell className="text-right">₹{formatNumber(row.clientPayable)}</TableCell>
                                <TableCell className="text-right">₹{formatNumber(row.upperPayable)}</TableCell>
                                <TableCell className={`text-right font-bold ${row.brokerProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {row.brokerProfit >= 0 ? `+₹{formatNumber(row.brokerProfit)}` : `-₹{formatNumber(Math.abs(row.brokerProfit))}`}
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                            <TableFooter>
                            <TableRow className="bg-muted/50 hover:bg-muted">
                                <TableCell colSpan={1} className="font-bold text-lg text-right">Total</TableCell>
                                <TableCell className="text-right font-bold text-lg">₹{formatNumber(grandTotalForPeriod.clientPayable)}</TableCell>
                                <TableCell className="text-right font-bold text-lg">₹{formatNumber(grandTotalForPeriod.upperPayable)}</TableCell>
                                <TableCell className={`text-right font-bold text-lg ${grandTotalForPeriod.brokerProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {grandTotalForPeriod.brokerProfit >= 0 ? `+₹{formatNumber(grandTotalForPeriod.brokerProfit)}` : `-₹{formatNumber(Math.abs(grandTotalForPeriod.brokerProfit))}`}
                                </TableCell>
                            </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    No data available for the selected period.
                </div>
            )}
        </div>
    );
};


type AdminPanelProps = {
  userId?: string;
  clients: Client[];
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
};


export default function AdminPanel({ userId, clients, savedSheetLog }: AdminPanelProps) {
    const { toast } = useToast();
    const [upperComm, setUpperComm] = useState(defaultUpperComm.toString());
    const [upperPair, setUpperPair] = useState(defaultUpperPair.toString());
    const [appliedUpperComm, setAppliedUpperComm] = useState(defaultUpperComm.toString());
    const [appliedUpperPair, setAppliedUpperPair] = useState(defaultUpperPair.toString());
    const { declaredNumbers } = useDeclaredNumbers(userId);
    const [summaryDate, setSummaryDate] = useState<Date>(new Date());

    useEffect(() => {
        const savedComm = localStorage.getItem('upperBrokerComm');
        const savedPair = localStorage.getItem('upperBrokerPair');
        if (savedComm) {
            setUpperComm(savedComm);
            setAppliedUpperComm(savedComm);
        }
        if (savedPair) {
            setUpperPair(savedPair);
            setAppliedUpperPair(savedPair);
        }
    }, []);

    const handleApplySettings = () => {
        setAppliedUpperComm(upperComm);
        setAppliedUpperPair(upperPair);
        localStorage.setItem('upperBrokerComm', upperComm);
        localStorage.setItem('upperBrokerPair', upperPair);
        toast({ title: "Settings Applied", description: "Broker commission and pair rates have been updated." });
    };

    const calculateDailyProfit = useCallback((date: Date) => {
        const upperCommPercent = parseFloat(appliedUpperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
        
        let totalClientPayable = 0;
        let totalUpperPayable = 0;
        
        const periodStart = startOfDay(date);
        const periodEnd = endOfDay(date);
        const allLogs = Object.values(savedSheetLog).flat();

        const logsForPeriod = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= periodStart && logDate <= periodEnd;
        });

        // Calculate Client Payable
        clients.forEach(client => {
            let clientGameTotal = 0;
            let clientPassingAmount = 0;
            const clientCommPercent = (client.comm && !isNaN(parseFloat(client.comm))) ? parseFloat(client.comm) / 100 : 0;
            const clientPairRate = parseFloat(client.pair) || defaultClientPair;

            logsForPeriod.filter(log => log.clientId === client.id).forEach(log => {
                clientGameTotal += log.gameTotal;
                const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
                if (declaredNumber && log.data[declaredNumber]) {
                    clientPassingAmount += parseFloat(log.data[declaredNumber]) || 0;
                }
            });

            if (clientGameTotal > 0) {
                const clientCommission = clientGameTotal * clientCommPercent;
                const clientNet = clientGameTotal - clientCommission;
                const clientWinnings = clientPassingAmount * clientPairRate;
                totalClientPayable += clientNet - clientWinnings;
            }
        });

        // Calculate Upper Payable
        let totalGameAmount = 0;
        let totalPassingAmount = 0;
        logsForPeriod.forEach(log => {
            totalGameAmount += log.gameTotal;
            const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
            if (declaredNumber && log.data[declaredNumber]) {
                totalPassingAmount += parseFloat(log.data[declaredNumber]) || 0;
            }
        });
        
        const upperCommission = totalGameAmount * upperCommPercent;
        const upperNet = totalGameAmount - upperCommission;
        const upperWinnings = totalPassingAmount * upperPairRate;
        totalUpperPayable = upperNet - upperWinnings;

        return totalClientPayable - totalUpperPayable;
    }, [appliedUpperComm, appliedUpperPair, clients, savedSheetLog, declaredNumbers]);


    const todaysNet = useMemo(() => calculateDailyProfit(summaryDate), [calculateDailyProfit, summaryDate]);
    const yesterdaysNet = useMemo(() => calculateDailyProfit(subDays(summaryDate, 1)), [calculateDailyProfit, summaryDate]);

    const runningTotal = yesterdaysNet + todaysNet;

    const { 
        brokerRawDrawTotals, 
        brokerPassingDrawTotals, 
        grandRawTotal, 
        grandPassingTotal,
        brokerCommission,
        finalNetTotalForBroker
    } = useMemo(() => {
        const upperCommPercent = parseFloat(appliedUpperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
        
        const rawTotalsByDraw: { [key: string]: number } = {};
        const passingTotalsByDraw: { [key: string]: number } = {};

        for (const drawName of draws) {
            rawTotalsByDraw[drawName] = 0;
            passingTotalsByDraw[drawName] = 0;
            const logsForDraw = (savedSheetLog[drawName] || []).filter(log => isSameDay(new Date(log.date), summaryDate));


            for (const log of logsForDraw) {
                rawTotalsByDraw[drawName] += log.gameTotal;
                const dateStr = format(new Date(log.date), 'yyyy-MM-dd');
                const declarationId = `${log.draw}-${dateStr}`;
                const declaredNum = declaredNumbers[declarationId]?.number;

                if (declaredNum && log.data[declaredNum]) {
                    const passingAmount = parseFloat(log.data[declaredNum]) || 0;
                    passingTotalsByDraw[drawName] += passingAmount;
                }
            }
        }
        
        const grandRawTotal = Object.values(rawTotalsByDraw).reduce((sum, total) => sum + total, 0);
        const grandPassingTotal = Object.values(passingTotalsByDraw).reduce((sum, total) => sum + total, 0);

        const brokerCommission = grandRawTotal * upperCommPercent;
        const finalGrandPassingTotal = grandPassingTotal * upperPairRate;
        const brokerProfit = (grandRawTotal - brokerCommission) - finalGrandPassingTotal;

        return { 
            brokerRawDrawTotals: rawTotalsByDraw, 
            brokerPassingDrawTotals: passingTotalsByDraw,
            grandRawTotal,
            grandPassingTotal,
            brokerCommission,
            finalNetTotalForBroker: brokerProfit
        };
    }, [savedSheetLog, declaredNumbers, appliedUpperComm, appliedUpperPair, summaryDate]);


  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>High-level overview of your brokerage operations.</CardDescription>
        </div>
        <div className="space-y-2 w-64">
            <RunningTotalSummaryCard 
                runningTotal={runningTotal}
            />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-y-auto">
        <div>
            <div className="flex items-center gap-4 mb-2">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Landmark className="h-5 w-5" /> Daily Summary
                </h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !summaryDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {summaryDate ? format(summaryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={summaryDate}
                        onSelect={(date) => date && setSummaryDate(date)}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {draws.map(drawName => (
                    <BrokerDrawSummaryCard 
                        key={drawName}
                        title={drawName} 
                        rawTotal={brokerRawDrawTotals[drawName] || 0} 
                        passingTotal={brokerPassingDrawTotals[drawName] || 0}
                    />
                ))}
                <GrandTotalSummaryCard
                    title="Final Summary"
                    finalValue={finalNetTotalForBroker}
                    grandRawTotal={grandRawTotal}
                    grandPassingTotal={grandPassingTotal}
                    brokerCommission={brokerCommission}
                    upperPairRate={parseFloat(appliedUpperPair) || defaultUpperPair}
                />
            </div>
        </div>

        <Separator className="my-8" />
        
        <div>
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5" /> Broker Profit &amp; Loss
            </h3>
            <BrokerProfitLoss 
                userId={userId}
                clients={clients} 
                savedSheetLog={savedSheetLog}
                upperComm={upperComm}
                setUpperComm={setUpperComm}
                upperPair={upperPair}
                setUpperPair={setUpperPair}
                onApply={handleApplySettings}
                appliedUpperComm={appliedUpperComm}
                appliedUpperPair={appliedUpperPair}
                selectedDate={summaryDate}
                setSelectedDate={setSummaryDate}
            />
        </div>
      </CardContent>
    </Card>
  );
}
