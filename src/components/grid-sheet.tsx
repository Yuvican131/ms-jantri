"use client"
import React, { useState, useImperativeHandle, forwardRef, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2, Copy, X, Save, RotateCcw, Undo2, Eye, FileSpreadsheet, ArrowLeft, Grid, Edit } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { format, isSameDay } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Account } from "./accounts-manager";
import { formatNumber } from "@/lib/utils"
import type { Client } from "@/hooks/useClients"
import type { SavedSheetInfo } from "@/hooks/useSheetLog"
import { useSheetLog } from "@/hooks/useSheetLog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { DataEntryControls } from "./DataEntryControls"
import { GridView } from "./GridView"


type CellData = { [key: string]: string }
type ValidationResult = {
  isValid: boolean
  recommendation: string
}
type CellValidation = { [key: string]: ValidationResult & { isLoading: boolean } }

type Sheet = {
  id: string;
  name: string;
  data: CellData;
  rowTotals: { [key: number]: string };
};

type ClientSheetData = {
  [clientId: string]: {
    data: CellData;
    rowTotals: { [key: string]: string };
  };
};

const initialSheets: Sheet[] = [
  { id: "1", name: "Sheet 1", data: {}, rowTotals: {} },
]

const GRID_ROWS = 10;
const GRID_COLS = 10;
const DUMMY_ACCOUNTS = "Revenue, Expenses, Assets, Liabilities, Equity, COGS"
const DUMMY_RULES = "Cell content must be a number or a standard account name. If it's a number, it can be positive or negative."
const MAX_COMBINATIONS = 100;

export type GridSheetHandle = {
  handleClientUpdate: (client: Client) => void;
  clearSheet: () => void;
  getClientData: (clientId: string) => CellData | undefined;
  getClientCurrentData: (clientId: string) => CellData | undefined;
  getClientPreviousData: (clientId: string) => CellData | undefined;
};

export type GridSheetProps = {
  draw: string;
  date: Date;
  lastEntry: string;
  setLastEntry: (entry: string) => void;
  isLastEntryDialogOpen: boolean;
  setIsLastEntryDialogOpen: (open: boolean) => void;
  clients: Client[];
  onClientSheetSave: (clientName: string, clientId: string, data: CellData, draw: string, date: Date) => void;
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  accounts: Account[];
  draws: string[];
}

const MasterSheetViewer = ({
  allSavedLogs,
  draw,
  date,
  onDeleteLog,
}: {
  allSavedLogs: { [draw: string]: SavedSheetInfo[] };
  draw: string;
  date: Date;
  onDeleteLog: (logId: string, clientName: string) => void;
}) => {
  const { toast } = useToast();
  const [masterSheetData, setMasterSheetData] = useState<CellData>({});
  const [cuttingValue, setCuttingValue] = useState("");
  const [lessValue, setLessValue] = useState("");
  const [dabbaValue, setDabbaValue] = useState("");
  const [selectedLogIndices, setSelectedLogIndices] = useState<number[]>([]);
  const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
  const [generatedSheetContent, setGeneratedSheetContent] = useState("");
  const [currentLogs, setCurrentLogs] = useState<SavedSheetInfo[]>([]);

  React.useEffect(() => {
    const logsForDate = (allSavedLogs[draw] || []).filter(log => isSameDay(new Date(log.date), date));
    setCurrentLogs(logsForDate);
    setSelectedLogIndices(logsForDate.map((_, index) => index));
  }, [draw, date, allSavedLogs]);

  React.useEffect(() => {
    const logsToProcess = (currentLogs || []);
    const newMasterData: CellData = {};
    
    selectedLogIndices.forEach(index => {
      const logEntry = logsToProcess[index];
      if (logEntry) {
        Object.entries(logEntry.data).forEach(([key, value]) => {
          const numericValue = parseFloat(value) || 0;
          newMasterData[key] = String((parseFloat(newMasterData[key]) || 0) + numericValue);
        });
      }
    });
    setMasterSheetData(newMasterData);
  }, [selectedLogIndices, currentLogs]);

  const calculateRowTotal = (rowIndex: number, data: CellData) => {
    let total = 0;
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const cellNumber = rowIndex * GRID_COLS + colIndex;
      const key = cellNumber.toString().padStart(2, '0');
      const value = data[key];
      if (value && !isNaN(Number(value))) {
        total += Number(value);
      }
    }
    return total;
  };
  
  const calculateColumnTotal = (colIndex: number, data: CellData) => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(data[key]) || 0;
    }
    return total;
  };

  const calculateGrandTotal = (data: CellData) => {
    return Object.values(data).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  };
  
  const masterSheetGrandTotal = calculateGrandTotal(masterSheetData);

  const handleApplyCutting = () => {
    const cutValue = parseFloat(cuttingValue);
    if (isNaN(cutValue)) {
      toast({ title: "Invalid Input", description: "Please enter a valid number for cutting.", variant: "destructive" });
      return;
    }

    const newMasterData = { ...masterSheetData };
    Object.keys(newMasterData).forEach(key => {
      const cellValue = parseFloat(newMasterData[key]) || 0;
      newMasterData[key] = String(cellValue - cutValue);
    });
    setMasterSheetData(newMasterData);

    toast({ title: "Cutting Applied", description: `Subtracted ${cutValue} from all cells in the master sheet.` });
    setCuttingValue("");
  };

  const handleApplyLess = () => {
    const lessPercent = parseFloat(lessValue);
    if (isNaN(lessPercent) || lessPercent < 0 || lessPercent > 100) {
      toast({ title: "Invalid Input", description: "Please enter a valid percentage (0-100) for Less.", variant: "destructive" });
      return;
    }

    const newMasterData = { ...masterSheetData };
    Object.keys(newMasterData).forEach(key => {
      const cellValue = parseFloat(newMasterData[key]) || 0;
      if (cellValue !== 0) {
        const reduction = cellValue * (lessPercent / 100);
        newMasterData[key] = String(cellValue - reduction);
      }
    });
    setMasterSheetData(newMasterData);

    toast({ title: "Less Applied", description: `Subtracted ${lessPercent}% from all cells in the master sheet.` });
    setLessValue("");
  };

  const handleLogSelectionChange = (index: number) => {
    setSelectedLogIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  const handleGenerateSheet = () => {
    const valueToCells: { [value: string]: number[] } = {};

    for (const key in masterSheetData) {
      const value = masterSheetData[key];
      if (value && value.trim() !== '' && !isNaN(Number(value)) && Number(value) !== 0) {
        let cellNumber = parseInt(key);
        if (!valueToCells[value]) {
          valueToCells[value] = [];
        }
        valueToCells[value].push(cellNumber);
      }
    }

    const sheetBody = Object.entries(valueToCells)
      .map(([value, cells]) => {
        cells.sort((a, b) => a - b);
        const formattedCells = cells.map(cell => String(cell).padStart(2, '0'));
        return `${formattedCells.join(',')}=${value}`;
      })
      .join('\n');
    
    const grandTotal = calculateGrandTotal(masterSheetData);
    const totalString = `Total = ${formatNumber(grandTotal)}`;
    
    const fullContent = `${draw}\n${sheetBody}\n\n${totalString}`;

    setGeneratedSheetContent(fullContent);
    setIsGeneratedSheetDialogOpen(true);
    toast({ title: "Master Sheet Generated", description: "The multi-text area has been populated with the grid data." });
  };
  
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        toast({ title: "Copied to clipboard!" });
    }, (err) => {
        toast({ title: "Failed to copy", description: "Could not copy text to clipboard.", variant: "destructive" });
        console.error('Failed to copy: ', err);
    });
  };


  const masterSheetRowTotals = Array.from({ length: GRID_ROWS }, (_, rowIndex) => calculateRowTotal(rowIndex, masterSheetData));
  const masterSheetColumnTotals = Array.from({ length: GRID_COLS }, (_, colIndex) => calculateColumnTotal(colIndex, masterSheetData));
  
 return (
    <>
    <div className="flex h-full flex-col gap-4 bg-background p-1 md:p-4 items-stretch overflow-y-auto pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 w-full flex-grow">
        <div className="flex flex-col min-w-0">
            <div className="grid-sheet-layout h-full w-full">
                {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                    <React.Fragment key={`master-row-${rowIndex}`}>
                        {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                            const key = String(rowIndex * GRID_COLS + colIndex).padStart(2, '0');
                            return (
                                <div key={`master-cell-${key}`} className="relative flex items-center border rounded-sm grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                                    <div className="absolute top-0.5 left-1 text-[0.6rem] sm:top-1 sm:left-1.5 sm:text-xs select-none pointer-events-none z-10 grid-cell-number font-bold" style={{ color: 'var(--grid-cell-number-color)' }}>{key}</div>
                                    <Input
                                        type="text"
                                        readOnly
                                        className="p-0 h-full w-full text-center bg-transparent border-0 focus:ring-0 font-bold grid-cell-input transition-colors duration-300"
                                        value={masterSheetData[key] || ''}
                                        aria-label={`Cell ${key}`}
                                        style={{ color: 'var(--grid-cell-amount-color)' }}
                                    />
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-center font-medium border rounded-sm bg-transparent grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                            <span className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent grid-cell-total flex items-center justify-center" style={{ color: 'var(--grid-cell-total-color)' }}>
                                {masterSheetRowTotals[rowIndex] ? formatNumber(masterSheetRowTotals[rowIndex]) : ''}
                            </span>
                        </div>
                    </React.Fragment>
                ))}
                {Array.from({ length: GRID_COLS }, (_, colIndex) => (
                    <div key={`master-col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0 h-full border rounded-sm bg-transparent grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                         <span className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent grid-cell-total flex items-center justify-center" style={{ color: 'var(--grid-cell-total-color)' }}>
                            {masterSheetColumnTotals[colIndex] ? formatNumber(masterSheetColumnTotals[colIndex]) : ''}
                        </span>
                    </div>
                ))}
                <div className="flex items-center justify-center font-bold text-lg border rounded-sm grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)', color: 'var(--grid-cell-total-color)' }}>
                    {formatNumber(masterSheetGrandTotal)}
                </div>
            </div>
        </div>
        <div className="flex flex-col gap-4 w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
          <div className="border rounded-lg p-3 flex flex-col gap-3 bg-card">
              <h3 className="font-semibold text-sm text-card-foreground">Master Controls</h3>
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                      <Label htmlFor="master-cutting" className="text-sm text-card-foreground w-16">Cutting</Label>
                      <Input id="master-cutting" placeholder="Value" className="text-sm h-8 text-center flex-grow" value={cuttingValue} onChange={(e) => setCuttingValue(e.target.value)} />
                      <Button onClick={handleApplyCutting} size="sm" className="h-8">Apply</Button>
                  </div>
                  <div className="flex items-center gap-2">
                      <Label htmlFor="master-less" className="text-sm text-card-foreground w-16">Less (%)</Label>
                      <Input id="master-less" placeholder="Value" className="text-sm h-8 text-center flex-grow" value={lessValue} onChange={(e) => setLessValue(e.target.value)} />
                      <Button onClick={handleApplyLess} size="sm" className="h-8">Apply</Button>
                  </div>
                  <div className="flex items-center gap-2">
                      <Label htmlFor="master-dabba" className="text-sm text-card-foreground w-16">Dabba</Label>
                      <Input id="master-dabba" placeholder="Value" className="text-sm h-8 text-center flex-grow" value={dabbaValue} onChange={(e) => setDabbaValue(e.target.value)} />
                      <Button size="sm" className="h-8">Apply</Button>
                  </div>
              </div>
               <Button onClick={handleGenerateSheet} variant="outline" size="sm">
                Generate Sheet
              </Button>
          </div>
          <Card className="flex flex-col flex-grow bg-card min-h-0">
              <CardHeader className="p-3">
                  <CardTitle className="text-sm">Client Entries for {format(date, 'PPP')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-grow min-h-0">
                  <ScrollArea className="h-full">
                      <div className="space-y-2 pr-2">
                          {currentLogs.length > 0 ? currentLogs.map((log, index) => (
                              <div key={log.id} className="flex justify-between items-center p-2 rounded-md bg-muted text-sm group">
                                  <div className="flex items-center gap-2">
                                      <Checkbox
                                          id={`log-${draw}-${index}`}
                                          checked={selectedLogIndices.includes(index)}
                                          onCheckedChange={() => handleLogSelectionChange(index)}
                                          className="border-primary"
                                      />
                                      <label htmlFor={`log-${draw}-${index}`} className="cursor-pointer text-muted-foreground">{index + 1}. {log.clientName}</label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-mono font-semibold text-foreground">₹{formatNumber(log.gameTotal)}</span>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                          onClick={() => onDeleteLog(log.id, log.clientName)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete Log</span>
                                        </Button>
                                  </div>
                              </div>
                          )) : (
                              <div className="text-center text-muted-foreground italic h-full flex items-center justify-center">No logs for this draw on this date.</div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
     <Dialog open={isGeneratedSheetDialogOpen} onOpenChange={setIsGeneratedSheetDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generated Master Sheet Content</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              readOnly
              value={generatedSheetContent}
              rows={Math.min(15, generatedSheetContent.split('\n').length)}
              className="bg-muted"
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
            <Button onClick={() => handleCopyToClipboard(generatedSheetContent)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const GridSheet = forwardRef<GridSheetHandle, GridSheetProps>((props, ref) => {
  const { toast } = useToast()
  const { deleteSheetLogEntry } = useSheetLog();
  const [clientSheetData, setClientSheetData] = useState<ClientSheetData>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isMasterSheetDialogOpen, setIsMasterSheetDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{ id: string, name: string } | null>(null);
  const isMobile = useIsMobile();


  const [validations, setValidations] = useState<CellValidation>({})
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);
  const [previousSheetState, setPreviousSheetState] = useState<{ data: CellData, rowTotals: { [key: number]: string } } | null>(null);

  const currentData = selectedClientId ? clientSheetData[selectedClientId]?.data || {} : {};

  const multiTextRef = useRef<HTMLTextAreaElement>(null);
  const focusMultiText = useCallback(() => {
    multiTextRef.current?.focus();
  }, []);

  const showClientSelectionToast = () => {
    toast({
      title: "No Client Selected",
      description: "Please select a client to enable data entry.",
      variant: "destructive",
    });
  };

  const updateClientData = (clientId: string, data: CellData) => {
    setClientSheetData(prev => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] || { rowTotals: {} }),
        data,
      }
    }));
  };

  const handleSelectedClientChange = (clientId: string) => {
    if (clientId === "None") {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(clientId);
      updateClientData(clientId, {});
      focusMultiText();
    }
  };

  const saveDataForUndo = () => {
    if (!selectedClientId) return;
    const dataToSave = clientSheetData[selectedClientId];
    setPreviousSheetState({ data: { ...(dataToSave?.data || {}) }, rowTotals: { ...(dataToSave?.rowTotals || {}) } });
  };
  
  const handleRevertLastEntry = () => {
    if (previousSheetState && selectedClientId) {
      updateClientData(selectedClientId, previousSheetState.data);
      toast({ title: "Last Entry Reverted", description: "The last change has been undone." });
      setPreviousSheetState(null); // Clear previous state after reverting
    } else {
      toast({ title: "No Entry to Revert", description: "There is no previous action to revert.", variant: "destructive" });
    }
  };
  
  const handleDataUpdate = (updates: { [key: string]: number | string }, lastEntryString: string) => {
    if (!selectedClientId) {
        showClientSelectionToast();
        return;
    }
    saveDataForUndo();

    const newData = { ...currentData };
    const updatedKeys: string[] = [];

    for (const key in updates) {
        const value = updates[key];
        const currentVal = parseFloat(newData[key]) || 0;
        const updateVal = parseFloat(String(value)) || 0;
        newData[key] = String(currentVal + updateVal);
        updatedKeys.push(key);
    }

    if (updatedKeys.length > 0) {
        updateClientData(selectedClientId, newData);
        setUpdatedCells(updatedKeys);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Sheet Updated", description: `${updatedKeys.length} cell(s) have been updated.` });
    }
  };


  useImperativeHandle(ref, () => ({
    handleClientUpdate: (client: Client) => {
      if (selectedClientId === null) {
        showClientSelectionToast();
        return;
      }
      if (client.pair === '90') {
        saveDataForUndo();
        const cellNum = parseInt(client.name, 10);
        const commission = parseFloat(client.comm);

        if (!isNaN(cellNum) && cellNum >= 0 && cellNum <= 99 && !isNaN(commission)) {
          const key = (cellNum).toString().padStart(2, '0');
          
          const newData = { ...currentData };
          const currentValue = parseFloat(newData[key]) || 0;
          newData[key] = String(currentValue * commission);

          if(selectedClientId) {
            updateClientData(selectedClientId, newData);
          }

          setUpdatedCells(prev => [...prev, key]);
          setTimeout(() => setUpdatedCells(prev => prev.filter(c => c !== key)), 2000);
          toast({ title: "Sheet Updated by Client", description: `Cell ${client.name} value multiplied by commission ${client.comm}.` });
        }
      }
    },
    clearSheet: () => handleClearSheet(),
    getClientData: (clientId: string) => {
      return clientSheetData[clientId]?.data;
    },
    getClientCurrentData: (clientId: string) => {
        return clientSheetData[clientId]?.data;
    },
    getClientPreviousData: (clientId: string) => {
      const dateStr = props.date.toISOString().split('T')[0];
      const log = (props.savedSheetLog[props.draw] || []).find(l => l.clientId === clientId && l.date === dateStr);
      return log ? log.data : {};
    },
  }));

  const handleCellChange = (key: string, value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    saveDataForUndo();
    const newData = { ...currentData, [key]: value };

    if (selectedClientId) {
      updateClientData(selectedClientId, newData);
    }
  }

  const handleCellBlur = async (key: string) => {
    if (!selectedClientId) return;

    const cellContent = currentData[key]

    if (!cellContent || cellContent.trim() === "") {
      const newValidations = {...validations};
      delete newValidations[key];
      setValidations(newValidations);
      return;
    }

    setValidations(prev => ({ ...prev, [key]: { isValid: true, recommendation: '', isLoading: true } }))

    try {
      const result: ValidateCellContentOutput = await validateCellContent({
        cellContent,
        validationRules: DUMMY_RULES,
        commonlyUsedAccountNames: DUMMY_ACCOUNTS,
      })
      setValidations(prev => ({ ...prev, [key]: { ...result, isLoading: false } }))
    } catch (error) {
      console.error("Validation error:", error)
      toast({ title: "Error", description: "AI validation failed.", variant: "destructive" })
      setValidations(prev => ({ ...prev, [key]: { isValid: true, recommendation: '', isLoading: false } }))
    }
  }

  const checkBalance = (entryTotal: number): boolean => {
    if (!selectedClientId) return true;

    const client = props.clients.find(c => c.id === selectedClientId);
    if (!client || !client.activeBalance) return true;

    const activeBalance = client.activeBalance;
    const logsForDraw = props.savedSheetLog[props.draw] || [];
    const logEntry = logsForDraw.find(log => log.clientId === selectedClientId);
    const totalPlayed = logEntry?.gameTotal || 0;
    
    const remainingBalance = activeBalance - totalPlayed;

    if (entryTotal > remainingBalance) {
      toast({
        title: "Balance Limit Exceeded",
        description: `This entry of ${formatNumber(entryTotal)} exceeds the remaining balance of ${formatNumber(remainingBalance)}.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };
  
  const handleClearSheet = () => {
    if (selectedClientId === null) {
        showClientSelectionToast();
        return;
    }
    saveDataForUndo();
    updateClientData(selectedClientId, {});

    setValidations({});
    setUpdatedCells([]);
    props.setLastEntry('');
    toast({ title: "Sheet Cleared", description: "All cell values for the current view have been reset." });
  };
  
  const handleSaveSheet = () => {
    if (!selectedClientId) {
      toast({
        title: "No Client Selected",
        description: "Please select a client to save their sheet.",
        variant: "destructive",
      });
      return;
    }
    
    const newEntries = { ...(clientSheetData[selectedClientId]?.data || {}) };
    
    if (Object.keys(newEntries).length === 0) {
      toast({
        title: "No Data to Save",
        description: "The sheet is empty. Please enter some data before saving.",
        variant: "destructive",
      });
      return;
    }
    
    const clientName = props.clients.find(c => c.id === selectedClientId)?.name || "Unknown Client";
    
    props.onClientSheetSave(clientName, selectedClientId, newEntries, props.draw, props.date);
    
    updateClientData(selectedClientId, {});
    setPreviousSheetState(null);
    focusMultiText();
  };
  
  const handleDeleteLogEntry = () => {
    if (logToDelete) {
        deleteSheetLogEntry(logToDelete.id);
        toast({ title: "Log Deleted", description: `The entry for ${logToDelete.name} has been deleted.` });
    }
    setLogToDelete(null);
  };

  const getClientDisplay = (client: Client) => {
    const dateStr = props.date.toISOString().split('T')[0];
    const logEntry = (props.savedSheetLog[props.draw] || []).find(log => log.clientId === client.id && log.date === dateStr);
    const totalAmount = logEntry?.gameTotal || 0;
    return `${client.name} - ${formatNumber(totalAmount)}`;
  };
  
  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-1 md:p-2 flex-grow flex flex-col min-h-0">
          {isMobile ? (
            <Tabs defaultValue="grid" className="w-full flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="grid" className="gap-1.5"><Grid className="h-4 w-4" /> Grid</TabsTrigger>
                <TabsTrigger value="entry" className="gap-1.5"><Edit className="h-4 w-4" /> Entry</TabsTrigger>
              </TabsList>
              <TabsContent value="grid" className="flex-grow min-h-0 mt-2">
                <div className="flex flex-col min-w-0 h-full">
                  <GridView
                    currentData={currentData}
                    updatedCells={updatedCells}
                    validations={validations}
                    handleCellChange={handleCellChange}
                    handleCellBlur={handleCellBlur}
                    isDataEntryDisabled={!selectedClientId}
                    showClientSelectionToast={showClientSelectionToast}
                  />
                </div>
              </TabsContent>
              <TabsContent value="entry" className="flex-grow min-h-0 mt-2">
                 <DataEntryControls
                    clients={props.clients}
                    selectedClientId={selectedClientId}
                    onClientChange={handleSelectedClientChange}
                    onSave={handleSaveSheet}
                    onRevert={handleRevertLastEntry}
                    isRevertDisabled={!previousSheetState || selectedClientId === null}
                    onDataUpdate={handleDataUpdate}
                    onClear={handleClearSheet}
                    setLastEntry={props.setLastEntry}
                    checkBalance={checkBalance}
                    showClientSelectionToast={showClientSelectionToast}
                    getClientDisplay={getClientDisplay}
                    focusMultiText={focusMultiText}
                    openMasterSheet={() => setIsMasterSheetDialogOpen(true)}
                 />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 flex-grow min-h-0">
              <div className="flex flex-col min-w-0">
                  <GridView
                    currentData={currentData}
                    updatedCells={updatedCells}
                    validations={validations}
                    handleCellChange={handleCellChange}
                    handleCellBlur={handleCellBlur}
                    isDataEntryDisabled={!selectedClientId}
                    showClientSelectionToast={showClientSelectionToast}
                  />
              </div>
               <DataEntryControls
                  ref={multiTextRef}
                  clients={props.clients}
                  selectedClientId={selectedClientId}
                  onClientChange={handleSelectedClientChange}
                  onSave={handleSaveSheet}
                  onRevert={handleRevertLastEntry}
                  isRevertDisabled={!previousSheetState || selectedClientId === null}
                  onDataUpdate={handleDataUpdate}
                  onClear={handleClearSheet}
                  setLastEntry={props.setLastEntry}
                  checkBalance={checkBalance}
                  showClientSelectionToast={showClientSelectionToast}
                  getClientDisplay={getClientDisplay}
                  focusMultiText={focusMultiText}
                  openMasterSheet={() => setIsMasterSheetDialogOpen(true)}
               />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isMasterSheetDialogOpen} onOpenChange={setIsMasterSheetDialogOpen}>
        <DialogContent className="w-full h-full p-0 border-0 sm:max-w-none">
          <DialogHeader className="flex-row items-center p-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setIsMasterSheetDialogOpen(false)} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <DialogTitle>Master Sheet : {props.draw}</DialogTitle>
          </DialogHeader>
           <MasterSheetViewer 
             allSavedLogs={props.savedSheetLog}
             draw={props.draw}
             date={props.date}
             onDeleteLog={(id, name) => setLogToDelete({ id, name })}
           />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Log Entry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the sheet for <strong>{logToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLogEntry}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={props.isLastEntryDialogOpen} onOpenChange={props.setIsLastEntryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Last Entry</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              readOnly
              value={props.lastEntry || "No entries yet."}
              rows={Math.min(15, (props.lastEntry || "").split('\n').length)}
              className="bg-muted"
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
             <Button onClick={() => navigator.clipboard.writeText(props.lastEntry)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
});

GridSheet.displayName = 'GridSheet';

export default GridSheet;
