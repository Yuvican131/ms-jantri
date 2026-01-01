
"use client"
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Wallet, Calendar as CalendarIcon, Percent, Scale, TrendingUpIcon, TrendingDownIcon, Landmark, Banknote, Trash2 } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getYear, getMonth, startOfYear, endOfYear, eachMonthOfInterval, startOfDay, endOfDay, subDays, parseISO, compareAsc } from "date-fns";
import type { Client } from '@/hooks/useClients';
import type { SavedSheetInfo } from '@/hooks/useSheetLog';
import { useDeclaredNumbers } from '@/hooks/useDeclaredNumbers';
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
  brokerNet: number;
};

const BrokerReport = ({ userId, clients, savedSheetLog }: {
    userId?: string;
    clients: Client[];
    savedSheetLog: { [draw: string]: SavedSheetInfo[] };
}) => {
    const { declaredNumbers } = useDeclaredNumbers(userId);
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [upperComm, setUpperComm] = useState(defaultUpperComm.toString());
    const [upperPair, setUpperPair] = useState(defaultUpperPair.toString());
    const [appliedUpperComm, setAppliedUpperComm] = useState(defaultUpperComm.toString());
    const [appliedUpperPair, setAppliedUpperPair] = useState(defaultUpperPair.toString());
    const {toast} = useToast();

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
    
    const reportData: ReportRow[] = useMemo(() => {
        const upperCommPercent = parseFloat(appliedUpperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
        const clientsToProcess = selectedClientId === 'all' ? clients : clients.filter(c => c.id === selectedClientId);

        const calculateNetForPeriod = (periodStart: Date, periodEnd: Date): { clientPayable: number, upperPayable: number } => {
            let totalClientPayable = 0;
            let totalUpperPayable = 0;
            const allLogs = Object.values(savedSheetLog).flat();

            const logsForPeriod = allLogs.filter(log => {
                const logDate = startOfDay(new Date(log.date));
                const clientMatches = selectedClientId === 'all' || log.clientId === selectedClientId;
                return clientMatches && logDate >= periodStart && logDate <= periodEnd;
            });
            
            let allClientsGameTotal = 0;
            let allClientsPassingAmount = 0;

            clientsToProcess.forEach(client => {
                let clientGameTotalForPeriod = 0;
                let clientPassingAmountForPeriod = 0;
                const clientCommPercent = (client.comm && !isNaN(parseFloat(client.comm))) ? parseFloat(client.comm) / 100 : 0;
                const clientPairRate = parseFloat(client.pair) || defaultClientPair;

                logsForPeriod.filter(log => log.clientId === client.id).forEach(log => {
                    clientGameTotalForPeriod += log.gameTotal;
                    const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
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
            
            logsForPeriod.forEach(log => {
                allClientsGameTotal += log.gameTotal;
                const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
                if(declaredNumber && log.data[declaredNumber]) {
                    allClientsPassingAmount += parseFloat(log.data[declaredNumber]) || 0;
                }
            });

            const upperCommission = allClientsGameTotal * upperCommPercent;
            const upperNet = allClientsGameTotal - upperCommission;
            const upperWinnings = allClientsPassingAmount * upperPairRate;
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
                const { clientPayable, upperPayable } = calculateNetForPeriod(dayStart, dayEnd);
                return {
                    date: day,
                    label: format(day, "EEE, dd MMM yyyy"),
                    clientPayable,
                    upperPayable,
                    brokerNet: clientPayable - upperPayable,
                };
            });
        } else { // viewMode === 'year'
            const yearStart = startOfYear(selectedDate);
            const yearEnd = endOfYear(selectedDate);
            const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });

            return monthsInYear.map(month => {
                const monthStart = startOfMonth(month);
                const monthEnd = endOfMonth(month);
                const { clientPayable, upperPayable } = calculateNetForPeriod(monthStart, monthEnd);
                return {
                    date: month,
                    label: format(month, "MMMM yyyy"),
                    clientPayable,
                    upperPayable,
                    brokerNet: clientPayable - upperPayable,
                };
            });
        }
    
    }, [selectedDate, appliedUpperComm, appliedUpperPair, clients, savedSheetLog, declaredNumbers, selectedClientId, viewMode]);
  
    const grandTotalForPeriod = useMemo(() => {
        return reportData.reduce((acc, row) => {
            acc.clientPayable += row.clientPayable;
            acc.upperPayable += row.upperPayable;
            acc.brokerNet += row.brokerNet;
            return acc;
        }, { clientPayable: 0, upperPayable: 0, brokerNet: 0 });
    }, [reportData]);

    const hasData = useMemo(() => reportData.some(row => row.clientPayable !== 0 || row.upperPayable !== 0 || row.brokerNet !== 0), [reportData]);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Landmark className="h-5 w-5" /> Broker Profit &amp; Loss
            </h3>
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
                    <Button onClick={handleApplySettings}>Apply Settings</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                   <Label>{viewMode === 'month' ? 'Select Month' : 'Select Year'}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, viewMode === 'month' ? "MMMM yyyy" : "yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                                defaultMonth={selectedDate}
                                fromYear={2020}
                                toYear={new Date().getFullYear() + 5}
                                captionLayout="dropdown-buttons"
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
            
            {hasData ? (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {viewMode === 'month' ? 'Monthly Summary' : 'Yearly Summary'}
                            </CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${grandTotalForPeriod.brokerNet >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {grandTotalForPeriod.brokerNet >= 0 ? `+${formatNumber(grandTotalForPeriod.brokerNet)}` : `-${formatNumber(Math.abs(grandTotalForPeriod.brokerNet))}`}
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
                                <TableHead className="text-right">Client Net</TableHead>
                                <TableHead className="text-right">Upper Net</TableHead>
                                <TableHead className="text-right">Broker Net</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {reportData.map((row, index) => (
                                (row.clientPayable !== 0 || row.upperPayable !== 0 || row.brokerNet !== 0) &&
                                <TableRow key={index}>
                                <TableCell>{row.label}</TableCell>
                                <TableCell className="text-right">₹{formatNumber(row.clientPayable)}</TableCell>
                                <TableCell className="text-right">₹{formatNumber(row.upperPayable)}</TableCell>
                                <TableCell className={`text-right font-bold ${row.brokerNet >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {row.brokerNet >= 0 ? `+₹${formatNumber(row.brokerNet)}` : `-₹${formatNumber(Math.abs(row.brokerNet))}`}
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                            <TableFooter>
                            <TableRow className="bg-muted/50 hover:bg-muted">
                                <TableCell colSpan={1} className="font-bold text-lg text-right">Total</TableCell>
                                <TableCell className="text-right font-bold text-lg">₹{formatNumber(grandTotalForPeriod.clientPayable)}</TableCell>
                                <TableCell className="text-right font-bold text-lg">₹{formatNumber(grandTotalForPeriod.upperPayable)}</TableCell>
                                <TableCell className={`text-right font-bold text-lg ${grandTotalForPeriod.brokerNet >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {grandTotalForPeriod.brokerNet >= 0 ? `+₹${formatNumber(grandTotalForPeriod.brokerNet)}` : `-₹${formatNumber(Math.abs(grandTotalForPeriod.brokerNet))}`}
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
    const { declaredNumbers } = useDeclaredNumbers(userId);
    const [summaryDate, setSummaryDate] = useState<Date>(new Date());
    const [appliedUpperComm, setAppliedUpperComm] = useState(defaultUpperComm.toString());
    const [appliedUpperPair, setAppliedUpperPair] = useState(defaultUpperPair.toString());

    const [jamaAmount, setJamaAmount] = useState('');
    const [lenaAmount, setLenaAmount] = useState('');
    
    const [settlements, setSettlements] = useState<{[key: string]: number}>({});

    useEffect(() => {
        try {
            const savedSettlements = localStorage.getItem('brokerSettlements');
            if (savedSettlements) {
                setSettlements(JSON.parse(savedSettlements));
            }
        } catch (error) {
            console.error("Failed to parse settlements from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('brokerSettlements', JSON.stringify(settlements));
    }, [settlements]);


    const handleSettlement = () => {
        const jama = parseFloat(jamaAmount) || 0;
        const lena = parseFloat(lenaAmount) || 0;
        
        if (jama > 0 && lena > 0) {
            toast({ title: "Invalid Entry", description: "Please enter a value in either Jama or Lena, not both.", variant: "destructive" });
            return;
        }

        const settlementChange = lena - jama;
        const dateKey = format(summaryDate, 'yyyy-MM-dd');
        
        setSettlements(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || 0) + settlementChange
        }));
        
        toast({ title: "Settlement Recorded", description: `Settlement for ${format(summaryDate, 'PPP')} has been updated.` });
        setJamaAmount('');
        setLenaAmount('');
    };

    const calculateDailyNet = useCallback((date: Date) => {
        const upperCommPercent = parseFloat(appliedUpperComm) / 100 || defaultUpperComm / 100;
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
        
        let totalClientPayable = 0;
        let totalUpperPayable = 0;
        
        const periodStart = startOfDay(date);
        const allLogs = Object.values(savedSheetLog).flat();

        const logsForPeriod = allLogs.filter(log => {
            const logDate = startOfDay(new Date(log.date));
            return isSameDay(logDate, periodStart);
        });

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

    const calculateDrawSummary = (draw: string, date: Date) => {
        const allLogs = Object.values(savedSheetLog).flat();
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const logsForDrawAndDate = allLogs.filter(log => log.draw === draw && log.date === dateStr);
        
        let totalRaw = 0;
        let totalPassing = 0;
        
        const declaredNumber = declaredNumbers[`${draw}-${dateStr}`]?.number;

        logsForDrawAndDate.forEach(log => {
            totalRaw += log.gameTotal;
            if (declaredNumber && log.data[declaredNumber]) {
                totalPassing += parseFloat(log.data[declaredNumber]);
            }
        });
        
        return { totalRaw, totalPassing };
    };

    const finalSummaryForDay = useMemo(() => {
        const dateStr = format(summaryDate, 'yyyy-MM-dd');
        const logsForDay = Object.values(savedSheetLog).flat().filter(log => log.date === dateStr);
        let totalRaw = 0;
        let totalPassingUpper = 0;
        let brokerComm = 0;
    
        const upperPairRate = parseFloat(appliedUpperPair) || defaultUpperPair;
    
        logsForDay.forEach(log => {
            const client = clients.find(c => c.id === log.clientId);
            if (client) {
                const clientCommPercent = (client.comm && !isNaN(parseFloat(client.comm))) ? parseFloat(client.comm) / 100 : 0;
                brokerComm += log.gameTotal * clientCommPercent;
            }
            
            totalRaw += log.gameTotal;
    
            const declaredNumber = declaredNumbers[`${log.draw}-${log.date}`]?.number;
            if (declaredNumber && log.data[declaredNumber]) {
                totalPassingUpper += parseFloat(log.data[declaredNumber]);
            }
        });
    
        const totalPassingAmount = totalPassingUpper * upperPairRate;
        const finalNet = totalRaw - brokerComm - totalPassingAmount;
    
        return { totalRaw, brokerComm, totalPassing: totalPassingAmount, finalNet };
    }, [summaryDate, savedSheetLog, declaredNumbers, clients, appliedUpperPair]);


    const runningTotal = useMemo(() => {
        const allLogs = Object.values(savedSheetLog).flat();
        if (allLogs.length === 0 && Object.keys(settlements).length === 0) {
          return 0;
        }

        const allDatesWithActivity = [
            ...new Set(allLogs.map(log => startOfDay(parseISO(log.date)))),
            ...Object.keys(settlements).map(key => startOfDay(parseISO(key)))
        ];
        
        const uniqueSortedDates = [...new Set(allDatesWithActivity.map(d => d.getTime()))]
                                  .map(time => new Date(time))
                                  .sort(compareAsc);

        let cumulativeNet = 0;
        
        for (const date of uniqueSortedDates) {
            if (date > startOfDay(summaryDate)) {
                break;
            }
            
            const dailyNet = calculateDailyNet(date);
            const dateKey = format(date, 'yyyy-MM-dd');
            const dailySettlement = settlements[dateKey] || 0;
            
            cumulativeNet += dailyNet + dailySettlement;
        }

        return cumulativeNet;

    }, [savedSheetLog, summaryDate, calculateDailyNet, settlements]);


  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>High-level overview of your brokerage operations.</CardDescription>
        </div>
        <div className="flex items-center gap-4">
            <Card className="p-2 flex items-center gap-2">
                <Label className="text-sm font-semibold whitespace-nowrap">Running Net</Label>
                <div className={`text-lg font-extrabold ${runningTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatNumber(runningTotal)}</div>
            </Card>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-y-auto">
        <div>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2 flex-shrink-0">
                    <Banknote className="h-5 w-5" /> All Draws Summary
                </h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-auto min-w-[240px] justify-start text-left font-normal",
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

                <Card className="p-2 flex-grow">
                    <div className="flex items-end gap-2">
                        <div className='flex-grow'>
                            <Label htmlFor='jama-amount' className='text-xs font-semibold text-red-500'>Jama (Pay Out)</Label>
                            <Input id='jama-amount' placeholder='Amount' value={jamaAmount} onChange={e => {setJamaAmount(e.target.value); setLenaAmount('');}}/>
                        </div>
                        <div className='flex-grow'>
                             <Label htmlFor='lena-amount' className='text-xs font-semibold text-green-500'>Lena (Receive)</Label>
                            <Input id='lena-amount' placeholder='Amount' value={lenaAmount} onChange={e => {setLenaAmount(e.target.value); setJamaAmount('');}}/>
                        </div>
                        <Button onClick={handleSettlement} className="h-10">Settle</Button>
                    </div>
                </Card>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-8">
                {draws.map(draw => {
                    const { totalRaw, totalPassing } = calculateDrawSummary(draw, summaryDate);
                    return (
                        <Card key={draw} className="p-4 flex flex-col">
                            <CardHeader className="p-0 mb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-primary">{draw}</CardTitle>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="p-0 text-sm space-y-1 flex-grow flex flex-col justify-between">
                                <div className="text-xl font-bold">{formatNumber(totalRaw)}</div>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Pass</span>
                                    <span className="font-semibold text-red-500">{formatNumber(totalPassing)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                
                 <Card className="p-4 bg-transparent border-2 border-green-500 col-span-2 md:col-span-1 lg:col-span-2 xl:col-auto">
                    <CardHeader className="p-0 mb-2">
                        <CardTitle className="text-base font-bold text-green-400">Final Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 text-sm space-y-1">
                        <div className="flex justify-between"><span>Total Raw:</span> <span className="font-semibold">{formatNumber(finalSummaryForDay.totalRaw)}</span></div>
                        <div className="flex justify-between"><span>% Broker Comm:</span> <span className="font-semibold">{formatNumber(finalSummaryForDay.brokerComm)}</span></div>
                        <div className="flex justify-between"><span>Total Passing:</span> <span className="font-semibold">{formatNumber(finalSummaryForDay.totalPassing)}</span></div>
                         <Separator className="my-2" />
                        <div className={`flex justify-between font-bold ${finalSummaryForDay.finalNet >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                           <span>Final Net:</span> <span>{formatNumber(finalSummaryForDay.finalNet)}</span>
                        </div>
                    </CardContent>
                 </Card>
                
            </div>

        </div>

        <Separator className="my-8" />
        
        <div>
            <BrokerReport 
                userId={userId}
                clients={clients} 
                savedSheetLog={savedSheetLog}
            />
        </div>
      </CardContent>
    </Card>
  );
}
