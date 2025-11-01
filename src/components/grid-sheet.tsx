
"use client"
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2, Copy, X, Save, RotateCcw, Undo2, Eye, FileSpreadsheet, ArrowLeft } from "lucide-react"
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

type GridSheetHandle = {
  handleClientUpdate: (client: Client) => void;
  clearSheet: () => void;
  getClientData: (clientId: string) => CellData | undefined;
  getClientCurrentData: (clientId: string) => CellData | undefined;
  getClientPreviousData: (clientId: string) => CellData | undefined;
};

type GridSheetProps = {
  draw: string;
  date: Date;
  lastEntry: string;
  setLastEntry: (entry: string) => void;
  isLastEntryDialogOpen: boolean;
  setIsLastEntryDialogOpen: (open: boolean) => void;
  clients: Client[];
  onClientSheetSave: (clientName: string, clientId: string, data: CellData, draw: string, date: Date) => void;
  savedSheetLog: SavedSheetInfo[];
  accounts: Account[];
  draws: string[];
}

const MasterSheetViewer = ({
  savedSheetLog,
  draw,
  date,
  onDeleteLog,
}: {
  savedSheetLog: SavedSheetInfo[];
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


  useEffect(() => {
    const logsForDate = (savedSheetLog || []).filter(log => isSameDay(new Date(log.date), date));
    setCurrentLogs(logsForDate);
    // When the component mounts or data changes, select all logs by default.
    setSelectedLogIndices(logsForDate.map((_, index) => index));
  }, [draw, date, savedSheetLog]);

  useEffect(() => {
    const logsToProcess = (savedSheetLog || []).filter(log => isSameDay(new Date(log.date), date));
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
  }, [selectedLogIndices, savedSheetLog, date]);

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
    <div className="flex h-full flex-col gap-4 bg-background p-1 md:p-4 items-start">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 flex-grow overflow-y-auto w-full">
        <div className="flex flex-col min-w-0 h-full">
            <div className="grid gap-0.5 w-full flex-grow" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS + 1}, minmax(0, 1fr))`}}>
                {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                    <React.Fragment key={`master-row-${rowIndex}`}>
                        {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                            const key = String(rowIndex * GRID_COLS + colIndex).padStart(2, '0');
                            return (
                                <div key={`master-cell-${key}`} className="relative flex items-center border rounded-sm" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                                    <div className="absolute top-1 left-1.5 text-xs select-none pointer-events-none z-10 font-bold" style={{ color: 'var(--grid-cell-number-color)' }}>{key}</div>
                                    <Input
                                        type="text"
                                        readOnly
                                        style={{ fontSize: 'clamp(0.8rem, 1.6vh, 1.1rem)'}}
                                        className="p-0 h-full w-full text-center transition-colors duration-300 border-0 focus:ring-0 bg-transparent font-bold"
                                        value={masterSheetData[key] || ''}
                                        aria-label={`Cell ${key}`}
                                    />
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-center font-medium border rounded-sm bg-transparent" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                            <Input readOnly value={masterSheetRowTotals[rowIndex] || ''} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)', color: 'var(--grid-cell-total-color)' }}/>
                        </div>
                    </React.Fragment>
                ))}
                {Array.from({ length: GRID_COLS }, (_, colIndex) => (
                    <div key={`master-col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0 h-full border rounded-sm bg-transparent" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                        <Input readOnly value={masterSheetColumnTotals[colIndex] || ''} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)', color: 'var(--grid-cell-total-color)' }}/>
                    </div>
                ))}
                <div className="flex items-center justify-center font-bold text-lg border rounded-sm" style={{ borderColor: 'var(--grid-cell-border-color)', color: 'var(--grid-cell-total-color)' }}>
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
              <CardContent className="p-3 flex-grow h-0">
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
        <DialogContent>
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

const generateCombinations = (digits1: string[], digits2: string[]): string[] => {
    const combinations = new Set<string>();
    if (!digits1 || !digits2) return [];
    for (const d1 of digits1) {
        for (const d2 of digits2) {
            combinations.add(`${d1}${d2}`);
        }
    }
    return Array.from(combinations);
};

const GridSheet = forwardRef<GridSheetHandle, GridSheetProps>((props, ref) => {
  const { toast } = useToast()
  const { getPreviousDataForClient, deleteSheetLogEntry } = useSheetLog();
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [clientSheetData, setClientSheetData] = useState<ClientSheetData>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isMasterSheetDialogOpen, setIsMasterSheetDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{ id: string, name: string } | null>(null);


  const [validations, setValidations] = useState<CellValidation>({})
  const [multiText, setMultiText] = useState("");
  const multiTextRef = useRef<HTMLTextAreaElement>(null);
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);
  const [laddiNum1, setLaddiNum1] = useState('');
  const [laddiNum2, setLaddiNum2] = useState('');
  const [laddiAmount, setLaddiAmount] = useState('');
  const [removeJodda, setRemoveJodda] = useState(false);
  const [reverseLaddi, setReverseLaddi] = useState(false);
  const [runningLaddi, setRunningLaddi] = useState(false);
  const [combinationCount, setCombinationCount] = useState(0);

  const [harupA, setHarupA] = useState('');
  const [harupB, setHarupB] = useState('');
  const [harupAmount, setHarupAmount] = useState('');
  const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
  const [generatedSheetContent, setGeneratedSheetContent] = useState("");
  
  const [previousSheetState, setPreviousSheetState] = useState<{ data: CellData, rowTotals: { [key: number]: string } } | null>(null);

  const laddiNum1Ref = useRef<HTMLInputElement>(null);
  const laddiNum2Ref = useRef<HTMLInputElement>(null);
  const laddiAmountRef = useRef<HTMLInputElement>(null);
  const harupAInputRef = useRef<HTMLInputElement>(null);
  const harupBInputRef = useRef<HTMLInputElement>(null);
  const harupAmountInputRef = useRef<HTMLInputElement>(null);
  
  const activeSheet = sheets.find(s => s.id === activeSheetId)!
  
  const currentData = selectedClientId
    ? clientSheetData[selectedClientId]?.data || {}
    : activeSheet.data;

  const currentRowTotals = selectedClientId
    ? clientSheetData[selectedClientId]?.rowTotals || {}
    : activeSheet.rowTotals;

  const isDataEntryDisabled = !selectedClientId;


  const showClientSelectionToast = () => {
    toast({
      title: "No Client Selected",
      description: "Please select a client to enable data entry.",
      variant: "destructive",
    });
  };

  const updateClientData = (clientId: string, data: CellData, rowTotals: { [key: string]: string }) => {
    setClientSheetData(prev => ({
      ...prev,
      [clientId]: { data, rowTotals }
    }));
  };

  const handleSelectedClientChange = (clientId: string) => {
    if (clientId === "None") {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(clientId);
      if (!clientSheetData[clientId]) {
        // When selecting a new client, check for previous data for the selected date
        const dateStr = props.date.toISOString().split('T')[0];
        const prevData = getPreviousDataForClient(clientId, props.draw, dateStr);
        updateClientData(clientId, prevData || {}, {});
      }
    }
  };

  const saveDataForUndo = () => {
    if (isDataEntryDisabled) return;
    const dataToSave = selectedClientId ? clientSheetData[selectedClientId] : activeSheet;
    setPreviousSheetState({ data: { ...(dataToSave?.data || {}) }, rowTotals: { ...(dataToSave?.rowTotals || {}) } });
  };
  
  const handleRevertLastEntry = () => {
    if (previousSheetState) {
      if (selectedClientId) {
        updateClientData(selectedClientId, previousSheetState.data, previousSheetState.rowTotals);
      } else {
        setSheets(prevSheets => prevSheets.map(sheet =>
          sheet.id === activeSheetId ? { ...sheet, data: previousSheetState.data, rowTotals: previousSheetState.rowTotals } : sheet
        ));
      }
      toast({ title: "Last Entry Reverted", description: "The last change has been undone." });
      setPreviousSheetState(null); // Clear previous state after reverting
    } else {
      toast({ title: "No Entry to Revert", description: "There is no previous action to revert.", variant: "destructive" });
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
            updateClientData(selectedClientId, newData, currentRowTotals);
          } else {
            setSheets(prevSheets => prevSheets.map(sheet => {
              if (sheet.id === activeSheetId) {
                return { ...sheet, data: newData };
              }
              return sheet;
            }));
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
      const log = props.savedSheetLog.find(l => l.clientId === clientId && l.date === dateStr);
      return log ? log.data : {};
    },
  }));

  const calculateCombinations = (num1: string, num2: string, removeJoddaFlag: boolean, reverseFlag: boolean, runningFlag: boolean): number => {
    if (runningFlag) {
      const start = parseInt(num1, 10);
      const end = parseInt(num2, 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
          return end - start + 1;
      }
      return 0;
    }

    const digits1 = num1.split('');
    const digits2 = num2.split('');
    let combinations = new Set<string>();
    
    if (digits1.length > 0 && digits2.length > 0) {
        for (const d1 of digits1) {
            for (const d2 of digits2) {
                if (removeJoddaFlag && d1 === d2) continue;
                combinations.add(`${d1}${d2}`);
                if (reverseFlag) {
                    combinations.add(`${d2}${d1}`);
                }
            }
        }
    }
    return combinations.size;
  };

  useEffect(() => {
    const count = calculateCombinations(laddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi);
    setCombinationCount(count);
  }, [laddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi]);


  const handleLaddiNum1Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    let newLaddiNum1 = value.replace(/[^0-9]/g, '');

    if (runningLaddi) {
        if (newLaddiNum1.length > 2) {
            newLaddiNum1 = newLaddiNum1.slice(0, 2);
        }
    } else {
        if (new Set(newLaddiNum1.split('')).size !== newLaddiNum1.length) {
            toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
            return;
        }
    }

    if (calculateCombinations(newLaddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum1(newLaddiNum1);
    if (!runningLaddi) {
        setLaddiNum2(newLaddiNum1);
    }
  }

  const handleLaddiNum2Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    let newLaddiNum2 = value.replace(/[^0-9]/g, '');

    if (runningLaddi) {
        if (newLaddiNum2.length > 2) {
            newLaddiNum2 = newLaddiNum2.slice(0, 2);
        }
    } else {
        if (new Set(newLaddiNum2.split('')).size !== newLaddiNum2.length) {
            toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
            return;
        }
    }
    if (calculateCombinations(laddiNum1, newLaddiNum2, removeJodda, reverseLaddi, runningLaddi) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum2(newLaddiNum2);
  }

  const handleHarupAChange = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newHarupA = value.replace(/[^0-9]/g, '');
    if (new Set(newHarupA.split('')).size !== newHarupA.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    setHarupA(newHarupA);
  };
  
  const handleHarupBChange = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newHarupB = value.replace(/[^0-9]/g, '');
    if (new Set(newHarupB.split('')).size !== newHarupB.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    setHarupB(newHarupB);
  };

  const handleCellChange = (key: string, value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    saveDataForUndo();
    const newData = { ...currentData, [key]: value };
    const newRowTotals = { ...currentRowTotals };

    if (selectedClientId) {
      updateClientData(selectedClientId, newData, newRowTotals);
    } else {
      setSheets(prevSheets => prevSheets.map(sheet => 
        sheet.id === activeSheetId ? { ...sheet, data: newData, rowTotals: newRowTotals } : sheet
      ));
    }
  }

  const handleCellBlur = async (key: string) => {
    if (isDataEntryDisabled) return;

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
    const logEntry = props.savedSheetLog.find(log => log.clientId === selectedClientId);
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
  
const handleMultiTextApply = () => {
    if (isDataEntryDisabled) {
        showClientSelectionToast();
        return;
    }

    const updates: { [key: string]: number } = {};
    let totalEntryAmount = 0;
    let errorOccurred = false;
    const lines = multiText.trim().split('\n');

    for (const line of lines) {
        if (errorOccurred) break;
        let processed = false;
        let currentLine = line.trim();

        // Rule 1: Laddi format like 234178=30=80
        const laddiMatch = currentLine.match(/^(\d+)=(\d+)=(\d+)$/);
        if (laddiMatch) {
            const [, digitsStr, countStr, amountStr] = laddiMatch;
            const uniqueDigits = [...new Set(digitsStr.split(''))];
            const requestedCount = parseInt(countStr, 10);
            const amount = parseInt(amountStr, 10);

            const withJoddaCount = uniqueDigits.length * uniqueDigits.length;
            const withoutJoddaCount = uniqueDigits.length * (uniqueDigits.length - 1);

            if (requestedCount !== withJoddaCount && requestedCount !== withoutJoddaCount) {
                toast({
                    title: "Wrong Laddi Combination",
                    description: `Input '${digitsStr}' requires ${withoutJoddaCount} or ${withJoddaCount} pairs, but ${requestedCount} were requested.`,
                    variant: "destructive"
                });
                errorOccurred = true;
                continue;
            }

            const combinations = new Set<string>();
            for (const d1 of uniqueDigits) {
                for (const d2 of uniqueDigits) {
                    if (requestedCount === withoutJoddaCount && d1 === d2) continue;
                    combinations.add(d1 + d2);
                }
            }

            const laddiTotal = combinations.size * amount;
            if (!checkBalance(laddiTotal)) {
                errorOccurred = true;
                continue;
            }
            totalEntryAmount += laddiTotal;
            combinations.forEach(cell => {
                updates[cell] = (updates[cell] || 0) + amount;
            });
            processed = true;
        }

        // Other patterns
        if (!processed) {
            // Remove ignored prefixes like 'gb'
            currentLine = currentLine.replace(/^[a-zA-Z]+\s*/, '');
            // Standardize delimiters
            let sanitizedLine = currentLine.replace(/[\s.]+/g, ',');

            const linePatterns = [
                /((\d{2},)*\d{2}),?\((\d+)\)/g, // 29,93,..,42,(10)
                /((\d+,)*\d+)\*(\d+)/g, // 04,24,..,86*30
                /((\d+,)*\d+)=+(\d+)/g, // 15,60=10 or 75=======300
                /(\d{2,})=(\d+)/g // 51=15
            ];

            let lineHandled = false;
            for (const pattern of linePatterns) {
                for (const match of sanitizedLine.matchAll(pattern)) {
                    lineHandled = true;
                    const cellsStr = match[1];
                    const amount = parseInt(match[match.length - 1], 10);
                    const cells = cellsStr.split(',').filter(c => c.length === 2);

                    if (isNaN(amount) || cells.length === 0) continue;

                    const entryTotal = cells.length * amount;
                    if (!checkBalance(entryTotal)) {
                        errorOccurred = true;
                        break;
                    }
                    totalEntryAmount += entryTotal;
                    cells.forEach(cell => {
                        updates[cell] = (updates[cell] || 0) + amount;
                    });
                }
                if (lineHandled || errorOccurred) break;
            }
        }
    }

    if (errorOccurred) return;

    if (Object.keys(updates).length > 0) {
        saveDataForUndo();
        const newData = { ...currentData };
        for (const key in updates) {
            newData[key] = String((parseFloat(newData[key]) || 0) + updates[key]);
        }
        if (selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
        }
        setUpdatedCells(Object.keys(updates));
        setTimeout(() => setUpdatedCells([]), 2000);
        props.setLastEntry(multiText);
        toast({
            title: "Sheet Updated",
            description: `${Object.keys(updates).length} cell(s) have been updated.`
        });
        setMultiText("");
    } else if (multiText.trim().length > 0 && !errorOccurred) {
        toast({
            title: "No valid data found",
            description: "Could not parse the input. Please check the format.",
            variant: "destructive"
        });
    }
};

  const handleLaddiApply = () => {
    if (selectedClientId === null) {
        showClientSelectionToast();
        return;
    }
    if ((!laddiNum1 || !laddiNum2) && !runningLaddi || !laddiAmount) {
        toast({ title: "Laddi Error", description: "Please fill all required Laddi fields.", variant: "destructive" });
        return;
    }
    
    const amountValue = parseFloat(laddiAmount);
    if (isNaN(amountValue)) {
        toast({ title: "Laddi Error", description: "Invalid amount.", variant: "destructive" });
        return;
    }
    
    const combinations = new Set<string>();
    
    if (runningLaddi) {
        const start = parseInt(laddiNum1, 10);
        const end = parseInt(laddiNum2, 10);
        if (isNaN(start) || isNaN(end) || start < 0 || end > 99 || start > end) {
            toast({ title: "Running Error", description: "Invalid range. Please enter two-digit numbers (00-99) with start <= end.", variant: "destructive" });
            return;
        }
        for (let i = start; i <= end; i++) {
            combinations.add(i.toString().padStart(2, '0'));
        }
    } else {
        const digits1 = laddiNum1.split('');
        const digits2 = laddiNum2.split('');
        for (const d1 of digits1) {
            for (const d2 of digits2) {
                if (removeJodda && d1 === d2) continue;
                combinations.add(`${d1}${d2}`);
                if (reverseLaddi) {
                    combinations.add(`${d2}${d1}`);
                }
            }
        }
    }

    const entryTotal = combinations.size * amountValue;
    if (!checkBalance(entryTotal)) return;
    saveDataForUndo();

    const updates: { [key: string]: string } = {};

    combinations.forEach(cellNumStr => {
        let cellNum = parseInt(cellNumStr, 10);
        if (!isNaN(cellNum) && cellNum >= 0 && cellNum <= 99) {
            const key = (cellNum).toString().padStart(2, '0');
            const currentValueInUpdate = parseFloat(updates[key]) || 0;
            updates[key] = String(currentValueInUpdate + amountValue);
        }
    });

    if (Object.keys(updates).length > 0) {
        const newData = { ...currentData };
        const updatedKeys = Object.keys(updates);

        updatedKeys.forEach(key => {
            const currentValue = parseFloat(newData[key]) || 0;
            const addedValue = parseFloat(updates[key]) || 0;
            newData[key] = String(currentValue + addedValue);
        });

        const lastEntryString = `Laddi: ${laddiNum1}x${laddiNum2}=${laddiAmount} (Jodda: ${removeJodda}, Reverse: ${reverseLaddi}, Running: ${runningLaddi})`;

        if (selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
        } else {
            setSheets(prevSheets => prevSheets.map(sheet =>
                sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
            ));
        }

        setUpdatedCells(updatedKeys);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Laddi Updated", description: `${updatedKeys.length} cell(s) have been updated.` });

        setLaddiNum1('');
        setLaddiNum2('');
        setLaddiAmount('');
        setRemoveJodda(false);
        setReverseLaddi(false);
        setRunningLaddi(false);
    } else {
        toast({ title: "No Laddi Updates", description: "No valid cell combinations found to update.", variant: "destructive" });
    }
};

const handleHarupApply = () => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }

    const harupAmountValue = parseFloat(harupAmount);
    if (!harupAmount || isNaN(harupAmountValue)) {
      toast({ title: "HARUP Error", description: "Please provide a valid amount.", variant: "destructive" });
      return;
    }

    const harupADigits = [...new Set(harupA.replace(/[^0-9]/g, '').split(''))];
    const harupBDigits = [...new Set(harupB.replace(/[^0-9]/g, '').split(''))];

    if (harupADigits.length === 0 && harupBDigits.length === 0) {
      toast({ title: "HARUP Error", description: "Please fill HARUP 'A' or 'B' fields.", variant: "destructive" });
      return;
    }
    
    const entryTotal = (harupADigits.length * harupAmountValue) + (harupBDigits.length * harupAmountValue);

    if (!checkBalance(entryTotal)) return;

    saveDataForUndo();

    const perDigitAmountA = harupADigits.length > 0 ? harupAmountValue / 10 : 0;
    const perDigitAmountB = harupBDigits.length > 0 ? harupAmountValue / 10 : 0;
    const updates: { [key: string]: number } = {};

    harupADigits.forEach(digitA => {
      for (let i = 0; i < 10; i++) {
        const key = parseInt(`${digitA}${i}`).toString().padStart(2, '0');
        updates[key] = (updates[key] || 0) + perDigitAmountA;
      }
    });

    harupBDigits.forEach(digitB => {
      for (let i = 0; i < 10; i++) {
        const key = parseInt(`${i}${digitB}`).toString().padStart(2, '0');
        updates[key] = (updates[key] || 0) + perDigitAmountB;
      }
    });

    let lastEntryString = "";
    if (harupADigits.length > 0) lastEntryString += `A: ${harupA}=${harupAmount}\n`;
    if (harupBDigits.length > 0) lastEntryString += `B: ${harupB}=${harupAmount}\n`;

    const newData = { ...currentData };
    const updatedKeys = Object.keys(updates);

    if (updatedKeys.length > 0) {
      updatedKeys.forEach(key => {
        const currentValue = parseFloat(newData[key]) || 0;
        const addedValue = updates[key] || 0;
        newData[key] = String(currentValue + addedValue);
      });

      if (selectedClientId) {
        updateClientData(selectedClientId, newData, currentRowTotals);
      } else {
        setSheets(prevSheets => prevSheets.map(sheet =>
          sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
        ));
      }

      setUpdatedCells(updatedKeys);
      props.setLastEntry(lastEntryString.trim());
      setTimeout(() => setUpdatedCells([]), 2000);
      toast({ title: "HARUP Updated", description: `${updatedKeys.length} cell(s) have been updated.` });

      setHarupA('');
      setHarupB('');
      setHarupAmount('');
    } else {
      toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
    }
};


  const handleClearSheet = () => {
    if (selectedClientId === null) {
        showClientSelectionToast();
        return;
    }
    saveDataForUndo();
    const emptyData = {};
    const emptyRowTotals = {};

    if (selectedClientId) {
        updateClientData(selectedClientId, emptyData, emptyRowTotals);
    } else {
      setSheets(prevSheets => prevSheets.map(sheet => {
        if (sheet.id === activeSheetId) {
          return { ...sheet, data: emptyData, rowTotals: emptyRowTotals };
        }
        return sheet;
      }));
    }

    setValidations({});
    setMultiText("");
    setUpdatedCells([]);
    setHarupA('');
    setHarupB('');
    setHarupAmount('');
    props.setLastEntry('');
    toast({ title: "Sheet Cleared", description: "All cell values for the current view have been reset." });
  };
  
  const handleGenerateSheet = () => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const valueToCells: { [value: string]: number[] } = {};

    for (const key in currentData) {
      const value = currentData[key];
      if (value && value.trim() !== '' && !isNaN(Number(value)) && Number(value) !== 0) {
        let cellNumber = parseInt(key);
        
        let displayCellNumber = cellNumber;
        
        if (!valueToCells[value]) {
          valueToCells[value] = [];
        }
        valueToCells[value].push(displayCellNumber);
      }
    }

    const generatedText = Object.entries(valueToCells)
      .map(([value, cells]) => {
        cells.sort((a, b) => a - b);
        const formattedCells = cells.map(cell => {
           return String(cell).padStart(2, '0');
        });
        return `${formattedCells.join(',')}=${value}`;
      })
      .join('\n');

    setGeneratedSheetContent(generatedText);
    setIsGeneratedSheetDialogOpen(true);
    toast({ title: "Sheet Generated", description: "The multi-text area has been populated with the grid data." });
  };
  
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        toast({ title: "Copied to clipboard!" });
    }, (err) => {
        toast({ title: "Failed to copy", description: "Could not copy text to clipboard.", variant: "destructive" });
        console.error('Failed to copy: ', err);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, action?: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const target = e.target as HTMLElement;

      if (target.id === 'laddiNum1') {
        laddiNum2Ref.current?.focus();
      } else if (target.id === 'laddiNum2') {
        laddiAmountRef.current?.focus();
      } else if (target.id === 'laddiAmount') {
        handleLaddiApply();
      } else if (target.id === 'harupA') {
        harupBInputRef.current?.focus();
      } else if (target.id === 'harupB') {
        harupAmountInputRef.current?.focus();
      } else if (target.id === 'harupAmount') {
        handleHarupApply();
      } else if (target.tagName === 'TEXTAREA') {
        const textarea = e.currentTarget as HTMLTextAreaElement;
        const cursorPosition = textarea.selectionStart;
        const text = textarea.value;
        
        let lineStart = text.lastIndexOf('\n', cursorPosition - 1) + 1;
        let lineEnd = text.indexOf('\n', cursorPosition);
        if (lineEnd === -1) lineEnd = text.length;
        
        const currentLine = text.substring(lineStart, lineEnd);
        
        if (isDataEntryDisabled) {
          showClientSelectionToast();
          return;
        }

        if (!currentLine.includes('=')) {
          const newValue = text.substring(0, lineEnd) + '=' + text.substring(lineEnd);
          setMultiText(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineEnd + 1;
          }, 0);
        } else {
          handleMultiTextApply();
        }
      } else if (action) {
        action();
      }
    }
  };

  const handleMultiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isDataEntryDisabled) {
          showClientSelectionToast();
          return;
      }
      const rawValue = e.target.value;
      const formattedLines = rawValue.split('\n').map(line => {
          // Skip formatting for lines with multiple '=' which are likely laddi
          if ((line.match(/=/g) || []).length > 1) {
              return line;
          }
          
          // Format lines with a single '='
          const parts = line.split('=');
          if (parts.length === 2) {
              let numbersPart = parts[0].trim();
              const amountPart = parts[1];
              
              // Replace spaces and dots with commas, then ensure pairs
              numbersPart = numbersPart.replace(/[\s.]+/g, '').replace(/(\d{2})(?=\d)/g, '$1,');
              
              return `${numbersPart}=${amountPart}`;
          }
          
          // Format lines without '=' by adding commas between pairs
          if (!line.includes('=')) {
              return line.replace(/(\d{2})(?=\d)/g, '$1,');
          }

          return line;
      }).join('\n');
      setMultiText(formattedLines);
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
    
    // Pass only the new data to be merged in page.tsx
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
    
    // Let page.tsx handle the merging logic
    props.onClientSheetSave(clientName, selectedClientId, newEntries, props.draw, props.date);
    
    // Clear the sheet for the next entry for this client
    updateClientData(selectedClientId, {}, {});
    setPreviousSheetState(null);
  };
  
  const handleDeleteLogEntry = () => {
    if (logToDelete) {
        deleteSheetLogEntry(logToDelete.id);
        toast({ title: "Log Deleted", description: `The entry for ${logToDelete.name} has been deleted.` });
    }
    setLogToDelete(null);
  };


  if (!activeSheet) {
    return <div>Loading...</div>;
  }
  
  const rowTotals = Array.from({ length: GRID_ROWS }, (_, rowIndex) => {
    let total = 0;
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(currentData[key]) || 0;
    }
    return total;
  });

  const columnTotals = Array.from({ length: GRID_COLS }, (_, colIndex) => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(currentData[key]) || 0;
    }
    return total;
  });

  const grandTotal = rowTotals.reduce((acc, total) => acc + total, 0);

  const getClientDisplay = (client: Client) => {
    const todayStr = props.date.toISOString().split('T')[0];
    const logEntry = props.savedSheetLog.find(log => log.clientId === client.id && log.date === todayStr);
    const totalAmount = logEntry?.gameTotal || 0;
    return `${client.name} - ${formatNumber(totalAmount)}`;
  };


  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-1 md:p-2 flex-grow flex flex-col min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 flex-grow min-h-0">
            <div className="flex flex-col min-w-0 h-full">
               <div className="grid gap-0.5 w-full flex-grow grid-sheet-layout">
                {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                        const key = String(rowIndex * GRID_COLS + colIndex).padStart(2, '0');
                        const validation = validations[key]
                        const isUpdated = updatedCells.includes(key);

                        return (
                          <div key={key} className="relative flex border rounded-sm grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                            <div className="absolute top-0.5 left-1 text-[0.6rem] sm:top-1 sm:left-1.5 sm:text-xs select-none pointer-events-none z-10 grid-cell-number font-bold" style={{ color: 'var(--grid-cell-number-color)' }}>{key}</div>
                            <div
                              className={`p-0 h-full w-full justify-center bg-transparent border-0 focus:ring-0 flex items-end font-bold grid-cell-input ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''} ${isUpdated ? 'bg-primary/20' : ''} ${selectedClientId === null ? 'bg-muted/50 cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                            >
                              <span className="w-full text-center pb-1" style={{ color: 'var(--grid-cell-amount-color)' }}>
                                {currentData[key] || ''}
                              </span>
                            </div>
                            {(validation?.isLoading || (validation && !validation.isValid)) && (
                              <div className="absolute top-1/2 right-1 -translate-y-1/2 z-10">
                                {validation.isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button aria-label="Show validation error">
                                        <AlertCircle className="h-3 w-3 text-destructive" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="text-sm">{validation.recommendation}</PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            )}
                          </div>
                        )
                    })}
                     <div className="flex items-center justify-center font-medium border rounded-sm bg-transparent grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                      <Input readOnly value={rowTotals[rowIndex] ? formatNumber(rowTotals[rowIndex]) : ''} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent grid-cell-total" style={{ color: 'var(--grid-cell-total-color)' }}/>
                    </div>
                  </React.Fragment>
                ))}
                {/* Column Totals */}
                {Array.from({ length: GRID_COLS }, (_, colIndex) => (
                  <div key={`col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0 h-full border rounded-sm bg-transparent grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)' }}>
                    <Input readOnly value={columnTotals[colIndex] ? formatNumber(columnTotals[colIndex]) : ''} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent grid-cell-total" style={{ color: 'var(--grid-cell-total-color)' }}/>
                  </div>
                ))}
                <div className="flex items-center justify-center font-bold text-lg border rounded-sm grid-cell" style={{ borderColor: 'var(--grid-cell-border-color)', color: 'var(--grid-cell-total-color)' }}>
                    {formatNumber(grandTotal)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full lg:w-[320px] xl:w-[360px] min-h-0">
               <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Select value={selectedClientId || 'None'} onValueChange={handleSelectedClientChange}>
                            <SelectTrigger className="flex-grow h-8 text-xs">
                                <SelectValue>
                                  {selectedClientId && props.clients.find(c => c.id === selectedClientId) ? getClientDisplay(props.clients.find(c => c.id === selectedClientId)!) : "Select Client"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None (Master Sheet)</SelectItem>
                                {props.clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {getClientDisplay(client)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSaveSheet} disabled={!selectedClientId} size="sm" className="h-8 text-xs">
                            <Save className="h-3 w-3 mr-1" />
                            Save
                        </Button>
                        <Button onClick={handleRevertLastEntry} variant="outline" disabled={!previousSheetState || selectedClientId === null} size="sm" className="h-8 text-xs">
                            <Undo2 className="h-3 w-3 mr-1" />
                            Revert
                        </Button>
                    </div>
                </div>
               <ScrollArea className="flex-grow pr-2 -mr-2">
                <div className="space-y-2 pr-2">
                  <div className="border rounded-lg p-2 flex flex-col gap-2">
                      <h3 className="font-semibold text-xs mb-1">Multi-Text</h3>
                      <Textarea
                          ref={multiTextRef}
                          placeholder="e.g. 12,21=100 or 123=45=10"
                          rows={4}
                          value={multiText}
                          onChange={handleMultiTextChange}
                          onKeyDown={handleKeyDown}
                          className="w-full text-base"
                          disabled={selectedClientId === null}
                          onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                      />
                      <div className="flex flex-wrap gap-2 mt-1 items-start">
                          <Button onClick={handleMultiTextApply} className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={selectedClientId === null} size="sm">Apply</Button>
                          <Button onClick={handleGenerateSheet} variant="outline" className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={selectedClientId === null} size="sm">
                              Generate
                          </Button>
                          <Button onClick={handleClearSheet} variant="destructive" className="shrink-0 text-xs h-8" disabled={selectedClientId === null} size="sm">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Clear
                          </Button>
                      </div>
                  </div>
                  
                  <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <h3 className="font-semibold mb-1 text-xs">Laddi</h3>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 flex flex-col items-center gap-1">
                            <Input
                              ref={laddiNum1Ref}
                              id="laddiNum1" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "Start" : "Num 1"}
                              value={laddiNum1} onChange={(e) => handleLaddiNum1Change(e.target.value)} onKeyDown={handleKeyDown} disabled={selectedClientId === null}
                              onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                            />
                            <Label htmlFor="laddiNum1" className="text-xs whitespace-nowrap">{runningLaddi ? "Start" : "Pair"}</Label>
                        </div>
                         <div className="flex flex-col items-center justify-center px-2 my-1">
                          <div className="text-xs font-bold text-primary">{combinationCount}</div>
                          <span className="font-bold text-center text-sm">x</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                            <Input
                              ref={laddiNum2Ref}
                              id="laddiNum2" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "End" : "Num 2"}
                              value={laddiNum2} onChange={(e) => handleLaddiNum2Change(e.target.value)} onKeyDown={handleKeyDown} disabled={selectedClientId === null}
                              onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                            />
                            <Label htmlFor="laddiNum2" className="text-xs whitespace-nowrap">{runningLaddi ? "End" : "Pair"}</Label>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 items-center gap-1">
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="font-bold text-center">=</span>
                        <Input
                          ref={laddiAmountRef}
                          id="laddiAmount" type="text" className="text-center font-bold h-8 text-sm"
                          value={laddiAmount} onChange={(e) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setLaddiAmount(e.target.value) }}
                          placeholder="Amount" onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                          onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button onClick={handleLaddiApply} disabled={selectedClientId === null} size="sm" className="h-8 text-xs">Apply</Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-1">
                        <div className="flex items-center gap-2">
                            <Checkbox id="remove-jodda" checked={removeJodda} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setRemoveJodda(Boolean(checked)) }} disabled={selectedClientId === null || runningLaddi} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                            <Label htmlFor="remove-jodda" className={`text-xs ${selectedClientId === null || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Jodda</Label>
                             <Checkbox id="reverse-laddi" checked={reverseLaddi} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setReverseLaddi(Boolean(checked)) }} disabled={selectedClientId === null || runningLaddi} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                            <Label htmlFor="reverse-laddi" className={`text-xs ${selectedClientId === null || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Reverse</Label>
                            <Checkbox id="running-laddi" checked={runningLaddi} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setRunningLaddi(Boolean(checked)); setLaddiNum1(''); setLaddiNum2(''); }} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                            <Label htmlFor="running-laddi" className={`text-xs ${selectedClientId === null ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Running</Label>
                        </div>
                    </div>
                  </div>
                
                  <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <h3 className="font-semibold mb-1 text-xs">HARUP</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      <div className="flex items-center gap-1">
                          <Label htmlFor="harupA" className="w-6 text-center shrink-0 text-xs">A</Label>
                          <Input ref={harupAInputRef} id="harupA" placeholder="e.g. 123" className="min-w-0 h-8 text-xs" value={harupA} onChange={(e) => handleHarupAChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                      </div>
                      <div className="flex items-center gap-1">
                          <Label htmlFor="harupB" className="w-6 text-center shrink-0 text-xs">B</Label>
                          <Input ref={harupBInputRef} id="harupB" placeholder="e.g. 456" className="min-w-0 h-8 text-xs" value={harupB} onChange={(e) => handleHarupBChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                      </div>
                    </div>
                     <div className="flex items-center gap-2 mt-1">
                        <Label htmlFor="harupAmount" className="w-6 text-center shrink-0 text-xs">=</Label>
                        <Input ref={harupAmountInputRef} id="harupAmount" placeholder="Amount" className="font-bold h-8 text-xs" value={harupAmount} onChange={(e) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setHarupAmount(e.target.value) }} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                        <Button onClick={handleHarupApply} disabled={selectedClientId === null} size="sm" className="h-8 text-xs">Apply</Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="border rounded-lg p-2 mt-2">
                  <Button onClick={() => setIsMasterSheetDialogOpen(true)} variant="outline" className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      View Master Sheet
                  </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isGeneratedSheetDialogOpen} onOpenChange={setIsGeneratedSheetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generated Sheet Content</DialogTitle>
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
      
      <Dialog open={isMasterSheetDialogOpen} onOpenChange={setIsMasterSheetDialogOpen}>
        <DialogContent className="max-w-full w-full h-full max-h-screen sm:max-w-7xl p-0">
          <DialogHeader className="flex-row items-center p-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setIsMasterSheetDialogOpen(false)} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <DialogTitle>Master Sheet : {props.draw}</DialogTitle>
          </DialogHeader>
           <MasterSheetViewer 
             savedSheetLog={props.savedSheetLog}
             draw={props.draw}
             date={props.date}
             onDeleteLog={(id, name) => setLogToDelete({ id, name })}
           />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
        <DialogContent>
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
        <DialogContent>
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
             <Button onClick={() => handleCopyToClipboard(props.lastEntry)}>
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
