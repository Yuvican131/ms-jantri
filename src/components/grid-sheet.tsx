
"use client"
import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2, Copy, History } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import type { Client } from "./clients-manager"
import { format } from "date-fns"

type CellData = { [key: string]: string }
type ValidationResult = {
  isValid: boolean
  recommendation: string
}
type CellValidation = { [key: string]: ValidationResult & { isLoading: boolean } }

type Sheet = {
  id: string
  name: string
  data: CellData
  rowTotals: { [key: number]: string }
}

const initialSheets: Sheet[] = [
  { id: "1", name: "Q1 2024 Report", data: { }, rowTotals: {} },
  { id: "2", name: "Q2 2024 Estimates", data: { }, rowTotals: {} },
]

const GRID_ROWS = 10;
const GRID_COLS = 10;
const DUMMY_ACCOUNTS = "Revenue, Expenses, Assets, Liabilities, Equity, COGS"
const DUMMY_RULES = "Cell content must be a number or a standard account name. If it's a number, it can be positive or negative."
const MAX_COMBINATIONS = 100;

type GridSheetHandle = {
  handleClientUpdate: (client: Client) => void;
};

type GridSheetProps = {
  draw: string;
  date: Date;
  lastEntry: string;
  setLastEntry: (entry: string) => void;
}


const GridSheet = forwardRef<GridSheetHandle, GridSheetProps>((props, ref) => {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [validations, setValidations] = useState<CellValidation>({})
  const [multiText, setMultiText] = useState("");
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);
  const [laddiNum1, setLaddiNum1] = useState('');
  const [laddiNum2, setLaddiNum2] = useState('');
  const [laddiAmount, setLaddiAmount] = useState('');
  const [removeJodda, setRemoveJodda] = useState(false);
  const [combinationCount, setCombinationCount] = useState(0);

  const [harupA, setHarupA] = useState('');
  const [harupB, setHarupB] = useState('');
  const [harupAmount, setHarupAmount] = useState('');
  const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
  const [generatedSheetContent, setGeneratedSheetContent] = useState("");
  const [isLastEntryDialogOpen, setIsLastEntryDialogOpen] = useState(false);

  const activeSheet = sheets.find(s => s.id === activeSheetId)!

  useImperativeHandle(ref, () => ({
    handleClientUpdate: (client: Client) => {
      if (client.pair === '90') {
        const cellNum = parseInt(client.name, 10);
        const commission = parseFloat(client.comm);

        if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= GRID_ROWS * GRID_COLS && !isNaN(commission)) {
          const rowIndex = Math.floor((cellNum - 1) / GRID_COLS);
          const colIndex = (cellNum - 1) % GRID_COLS;
          const key = `${rowIndex}_${colIndex}`;
          
          const updatedSheets = sheets.map(sheet => {
            if (sheet.id === activeSheetId) {
              const newData = { ...sheet.data };
              const currentValue = parseFloat(newData[key]) || 0;
              newData[key] = String(currentValue * commission);
              return { ...sheet, data: newData };
            }
            return sheet;
          });
          setSheets(updatedSheets);
          setUpdatedCells(prev => [...prev, key]);
          setTimeout(() => setUpdatedCells(prev => prev.filter(c => c !== key)), 2000);
          toast({ title: "Sheet Updated by Client", description: `Cell ${client.name} value multiplied by commission ${client.comm}.` });
        }
      }
    }
  }));

  const calculateCombinations = (num1: string, num2: string, removeJoddaFlag: boolean): number => {
    const digits1 = num1.split('');
    const digits2 = num2.split('');
    let count = 0;
    if (digits1.length > 0 && digits2.length > 0) {
      if (removeJoddaFlag) {
        for (const d1 of digits1) {
          for (const d2 of digits2) {
            if (d1 !== d2) {
              count++;
            }
          }
        }
      } else {
        count = digits1.length * digits2.length;
      }
    }
    return count;
  };

  useEffect(() => {
    const count = calculateCombinations(laddiNum1, laddiNum2, removeJodda);
    setCombinationCount(count);
  }, [laddiNum1, laddiNum2, removeJodda]);

  const handleLaddiNum1Change = (value: string) => {
    const newLaddiNum1 = value.replace(/[^0-9]/g, '');
    if (new Set(newLaddiNum1.split('')).size !== newLaddiNum1.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    if (calculateCombinations(newLaddiNum1, laddiNum2, removeJodda) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum1(newLaddiNum1);
    setLaddiNum2(newLaddiNum1);
  }

  const handleLaddiNum2Change = (value: string) => {
    const newLaddiNum2 = value.replace(/[^0-9]/g, '');
    if (new Set(newLaddiNum2.split('')).size !== newLaddiNum2.length) {
        toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
        return;
    }
    if (calculateCombinations(laddiNum1, newLaddiNum2, removeJodda) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum2(newLaddiNum2);
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        const key = `${rowIndex}_${colIndex}`
        const newData = { ...sheet.data, [key]: value }
        return { ...sheet, data: newData }
      }
      return sheet
    })
    setSheets(updatedSheets)
  }

  const handleCellBlur = async (rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}_${colIndex}`
    const cellContent = activeSheet.data[key]

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

  const handleCreateNewSheet = () => {
    const newSheet: Sheet = {
      id: Date.now().toString(),
      name: `Sheet ${sheets.length + 1}`,
      data: {},
      rowTotals: {}
    }
    setSheets([...sheets, newSheet])
    setActiveSheetId(newSheet.id)
  }

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    const rows = Array.from({ length: GRID_ROWS }, (_, rowIndex) =>
      Array.from({ length: GRID_COLS }, (_, colIndex) => {
        const key = `${rowIndex}_${colIndex}`
        const cellValue = activeSheet.data[key] || ""
        return `"${cellValue.replace(/"/g, '""')}"`
      }).join(",")
    ).join("\n")

    csvContent += rows
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeSheet.name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const calculateRowTotal = (rowIndex: number) => {
    let total = 0
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const key = `${rowIndex}_${colIndex}`
      const value = activeSheet.data[key]
      if (value && !isNaN(Number(value))) {
        total += Number(value)
      }
    }
    return total
  }

  const handleRowTotalChange = (rowIndex: number, value: string) => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newRowTotals = { ...sheet.rowTotals, [rowIndex]: value }
        return { ...sheet, rowTotals: newRowTotals }
      }
      return sheet;
    });
    setSheets(updatedSheets);
  };

  const handleRowTotalBlur = (rowIndex: number, value: string) => {
    if(value.trim() === '') {
      handleRowTotalChange(rowIndex, '0');
    }
  }

  const getRowTotal = (rowIndex: number) => {
    if (activeSheet.rowTotals[rowIndex] !== undefined) {
      return activeSheet.rowTotals[rowIndex];
    }
    return calculateRowTotal(rowIndex).toString();
  }

  const calculateGrandTotal = () => {
    let total = 0;
    for (let i = 0; i < GRID_ROWS; i++) {
      total += Number(getRowTotal(i))
    }
    return total;
  };

  const handleMultiTextApply = () => {
    const lines = multiText.split('\n');
    const newData = { ...activeSheet.data };
    const updatedCellKeys = new Set<string>();
    let updates = 0;
    let lastEntryString = "";

    const evaluateExpression = (expression: string): string => {
        try {
            if (/^[0-9+\-*/.() ]+$/.test(expression)) {
                // eslint-disable-next-line no-eval
                const result = eval(expression);
                return String(result);
            }
            return expression; 
        } catch (e) {
            return expression;
        }
    };

    const formattedLines: string[] = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        const parts = line.split('=');
        if (parts.length !== 2) return;

        const valueStr = evaluateExpression(parts[1].trim());
        let cellNumbersStr = parts[0].trim();
        
        if (!/[\s,]+/.test(cellNumbersStr) && /^\d+$/.test(cellNumbersStr) && cellNumbersStr.length > 2 && cellNumbersStr.length % 2 === 0) {
             cellNumbersStr = cellNumbersStr.match(/.{1,2}/g)?.join(',') || cellNumbersStr;
        }
        
        const formattedCells = cellNumbersStr
          .split(/[\s,]+/)
          .filter(s => s)
          .map(s => String(parseInt(s, 10)).padStart(2, '0'))
          .join(',');

        formattedLines.push(`${formattedCells}=${valueStr}`);

        const numbers = cellNumbersStr.split(/[\s,]+/).filter(s => s.length > 0);

        numbers.forEach(numStr => {
            let cellNum = parseInt(numStr, 10);
            if(cellNum === 0) cellNum = 100;
            if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= GRID_ROWS * GRID_COLS) {
                const rowIndex = Math.floor((cellNum - 1) / GRID_COLS);
                const colIndex = (cellNum - 1) % GRID_COLS;
                const key = `${rowIndex}_${colIndex}`;
                
                const currentValue = parseFloat(newData[key]) || 0;
                const newValue = parseFloat(valueStr);

                if (!isNaN(newValue)) {
                    newData[key] = String(currentValue + newValue);
                    updatedCellKeys.add(key);
                    updates++;
                } else {
                    newData[key] = valueStr;
                    updatedCellKeys.add(key);
                    updates++;
                }
            }
        });
    });

    if (updates > 0) {
        lastEntryString = formattedLines.join('\n');
        const updatedSheets = sheets.map(sheet => {
            if (sheet.id === activeSheetId) {
                return { ...sheet, data: newData };
            }
            return sheet;
        });
        const currentUpdatedCells = Array.from(updatedCellKeys);
        setSheets(updatedSheets);
        setUpdatedCells(currentUpdatedCells);
        props.setLastEntry(lastEntryString);
        setMultiText("");
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Sheet Updated", description: `${currentUpdatedCells.length} cell(s) have been updated.` });
    } else {
        toast({ title: "No Updates", description: "No valid cell data found in the input.", variant: "destructive" });
    }
  };
  
  const handleLaddiApply = () => {
    if (!laddiNum1 || !laddiNum2 || !laddiAmount) {
        toast({ title: "Laddi Error", description: "Please fill all Laddi fields.", variant: "destructive" });
        return;
    }
    const newData = { ...activeSheet.data };
    const updatedCellKeys = new Set<string>();
    let updates = 0;
    let lastEntryString = "";

    const digits1 = laddiNum1.split('');
    const digits2 = laddiNum2.split('');

    for (const d1 of digits1) {
        for (const d2 of digits2) {
            if (removeJodda && d1 === d2) continue;

            let cellNumStr = `${d1}${d2}`;
            let cellNum = parseInt(cellNumStr, 10);
            if(cellNum === 0) cellNum = 100;


            if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= GRID_ROWS * GRID_COLS) {
                const rowIndex = Math.floor((cellNum-1) / GRID_COLS);
                const colIndex = (cellNum-1) % GRID_COLS;
                const key = `${rowIndex}_${colIndex}`;
                
                const currentValue = parseFloat(newData[key]) || 0;
                const newValue = parseFloat(laddiAmount);

                if (!isNaN(newValue)) {
                    newData[key] = String(currentValue + newValue);
                    updatedCellKeys.add(key);
                    updates++;
                }
            }
        }
    }

    if (updates > 0) {
        lastEntryString = `Laddi: ${laddiNum1} X ${laddiNum2} = ${laddiAmount}`;
        const updatedSheets = sheets.map(sheet => {
            if (sheet.id === activeSheetId) {
                return { ...sheet, data: newData };
            }
            return sheet;
        });
        const currentUpdatedCells = Array.from(updatedCellKeys);
        setSheets(updatedSheets);
        setUpdatedCells(currentUpdatedCells);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Sheet Updated", description: `${currentUpdatedCells.length} cell(s) have been updated from Laddi.` });
    } else {
        toast({ title: "No Laddi Updates", description: "No valid cell combinations found to update.", variant: "destructive" });
    }

    setLaddiNum1('');
    setLaddiNum2('');
    setLaddiAmount('');
};

const handleHarupApply = () => {
    const harupADigits = harupA.replace(/\s/g, '').split('');
    const harupBDigits = harupB.replace(/\s/g, '').split('');
    
    if ((harupADigits.length === 0 && harupBDigits.length === 0) || !harupAmount) {
        toast({ title: "HARUP Error", description: "Please fill HARUP 'A' or 'B' and Amount fields.", variant: "destructive" });
        return;
    }

    const totalAmount = parseFloat(harupAmount);
    if (isNaN(totalAmount)) {
        toast({ title: "HARUP Error", description: "Invalid amount.", variant: "destructive" });
        return;
    }

    const newData = { ...activeSheet.data };
    const updatedCellKeys = new Set<string>();
    let updates = 0;
    let lastEntryString = "";

    if (harupADigits.length > 0) {
        for (const digit of harupADigits) {
          const cellsToUpdate = [];
          for (let i = 0; i < 10; i++) {
            const cellNumStr = `${digit}${i}`;
            let cellNum = parseInt(cellNumStr, 10);
            if(cellNum === 0) cellNum = 100;
            if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= GRID_ROWS * GRID_COLS) {
              cellsToUpdate.push(cellNum);
            }
          }
          const amountPerCell = totalAmount / cellsToUpdate.length;
          for (const cellNum of cellsToUpdate) {
            const rowIndex = Math.floor((cellNum-1) / GRID_COLS);
            const colIndex = (cellNum-1) % GRID_COLS;
            const key = `${rowIndex}_${colIndex}`;
            const currentValue = parseFloat(newData[key]) || 0;
            newData[key] = String(currentValue + amountPerCell);
            updatedCellKeys.add(key);
            updates++;
          }
        }
    }
    
    if (harupBDigits.length > 0) {
      for (const digit of harupBDigits) {
        const cellsToUpdate = [];
        for (let i = 0; i < 10; i++) {
          const cellNumStr = `${i}${digit}`;
          let cellNum = parseInt(cellNumStr, 10);
            if(cellNum === 0) cellNum = 100;
          if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= GRID_ROWS * GRID_COLS) {
            cellsToUpdate.push(cellNum);
          }
        }
         const amountPerCell = totalAmount / cellsToUpdate.length;
         for (const cellNum of cellsToUpdate) {
            const rowIndex = Math.floor((cellNum-1) / GRID_COLS);
            const colIndex = (cellNum-1) % GRID_COLS;
            const key = `${rowIndex}_${colIndex}`;
            const currentValue = parseFloat(newData[key]) || 0;
            newData[key] = String(currentValue + amountPerCell);
            updatedCellKeys.add(key);
            updates++;
         }
      }
    }

    if (updates > 0) {
        const harupEntries: string[] = [];
        if (harupA) {
          harupEntries.push(`Harup: ${harupA} A = ${harupAmount}`);
        }
        if (harupB) {
          harupEntries.push(`Harup: ${harupB} B = ${harupAmount}`);
        }
        lastEntryString = harupEntries.join('\n');

        const updatedSheets = sheets.map(sheet => {
            if (sheet.id === activeSheetId) {
                return { ...sheet, data: newData };
            }
            return sheet;
        });
        const currentUpdatedCells = Array.from(updatedCellKeys);
        setSheets(updatedSheets);
        setUpdatedCells(currentUpdatedCells);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Sheet Updated", description: `${currentUpdatedCells.length} cell(s) have been updated from HARUP.` });
    } else {
        toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
    }
    
    setHarupA('');
    setHarupB('');
    setHarupAmount('');
};

  const handleClearSheet = () => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        return { ...sheet, data: {}, rowTotals: {} };
      }
      return sheet;
    });
    setSheets(updatedSheets);
    setValidations({});
    setMultiText("");
    setUpdatedCells([]);
    setHarupA('');
    setHarupB('');
    setHarupAmount('');
    props.setLastEntry('');
    toast({ title: "Sheet Cleared", description: "All cell values have been reset." });
  };
  
  const handleGenerateSheet = () => {
    const valueToCells: { [value: string]: number[] } = {};

    for (const key in activeSheet.data) {
      const value = activeSheet.data[key];
      if (value && value.trim() !== '' && !isNaN(Number(value)) && Number(value) !== 0) {
        const [rowIndex, colIndex] = key.split('_').map(Number);
        let cellNumber = rowIndex * GRID_COLS + colIndex + 1;
        if (cellNumber === 100) cellNumber = 0;
        
        if (!valueToCells[value]) {
          valueToCells[value] = [];
        }
        valueToCells[value].push(cellNumber);
      }
    }

    const generatedText = Object.entries(valueToCells)
      .map(([value, cells]) => {
        cells.sort((a, b) => a - b);
        const formattedCells = cells.map(cell => String(cell).padStart(2, '0'));
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

  const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  };

  const handleMultiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const parts = value.split('=');
    let numbersPart = parts[0];
    const valuePart = parts.length > 1 ? `=${parts.slice(1).join('=')}` : '';

    const cleanNumbers = numbersPart.replace(/[^0-9, ]/g, '');
    
    const autoFormattedNumbers = cleanNumbers
      .replace(/ /g, ',')
      .replace(/,+/g, ',') 
      .split(',')
      .map(s => s.trim())
      .filter(s => s)
      .flatMap(s => (s.length > 2 && /^\d+$/.test(s) && !s.includes(',')) ? s.match(/.{1,2}/g) || [] : s)
      .join(',');

    setMultiText(`${autoFormattedNumbers}${valuePart}`);
  };


  if (!activeSheet) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{props.draw} Sheet ({format(props.date, "PPP")}): {activeSheet.name}</CardTitle>
              <CardDescription>A 10x10 grid for your accounting data. Cells can be targeted by number (1-99 and 00).</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={activeSheetId} onValueChange={setActiveSheetId}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map(sheet => (
                    <SelectItem key={sheet.id} value={sheet.id}>{sheet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleCreateNewSheet}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Create new sheet</span>
              </Button>
              <Button onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <div className="grid gap-1 w-full" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`}}>
               {/* Header for Total column */}
               <div className="col-start-1" style={{gridColumn: `span ${GRID_COLS}`}}></div>
               <div className="flex items-center justify-center font-semibold text-muted-foreground min-w-[100px]">Total</div>
 

              {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                    const cellNumber = rowIndex * GRID_COLS + colIndex + 1;
                    const displayCellNumber = cellNumber === 100 ? 0 : cellNumber;
                    const key = `${rowIndex}_${colIndex}`
                    const validation = validations[key]
                    const isUpdated = updatedCells.includes(key);

                    return (
                      <div key={key} className="relative">
                        <div className="absolute top-0.5 left-1 text-xs text-muted-foreground select-none pointer-events-none z-10">{String(displayCellNumber).padStart(2, '0')}</div>
                        <Input
                          type="text"
                          className={`pt-5 text-sm transition-colors duration-300 min-w-0 ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''} ${isUpdated ? 'bg-primary/20' : ''}`}
                          value={activeSheet.data[key] || ''}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          onBlur={() => handleCellBlur(rowIndex, colIndex)}
                          aria-label={`Cell ${displayCellNumber}`}
                        />
                         {(validation?.isLoading || (validation && !validation.isValid)) && (
                          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-10">
                            {validation.isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                   <button aria-label="Show validation error">
                                    <AlertCircle className="h-4 w-4 text-destructive" />
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
                  <div className="flex items-center justify-center p-2 font-medium min-w-[100px] rounded-md">
                     <Input
                      type="text"
                      className="text-sm font-medium text-center min-w-0"
                      value={getRowTotal(rowIndex)}
                      onChange={(e) => handleRowTotalChange(rowIndex, e.target.value)}
                      onBlur={(e) => handleRowTotalBlur(rowIndex, e.target.value)}
                      aria-label={`Row ${rowIndex + 1} Total`}
                    />
                  </div>
                </React.Fragment>
              ))}
               <div style={{ gridColumn: `span ${GRID_COLS}` }} className="flex items-center justify-end p-2 font-bold min-w-[100px] mt-1 pr-4">Total</div>
               <div className="flex items-center justify-center p-2 font-bold min-w-[100px] bg-primary/20 rounded-md mt-1">
                  {calculateGrandTotal()}
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col xl:flex-row gap-4 pt-2">
          <div className="w-full xl:w-1/2 border rounded-lg p-4 flex gap-4">
            <div className="flex-1 flex flex-col">
              <h3 className="font-semibold mb-2">Multi - Text</h3>
              <Textarea
                placeholder="Enter cell data like: 01,02,03=50 or 01 02 03=50"
                rows={4}
                value={multiText}
                onChange={handleMultiTextChange}
                onKeyDown={(e) => handleKeyDown(e, handleMultiTextApply)}
                className="flex-grow"
              />
              <div className="flex gap-2 mt-2 items-stretch">
                <Button onClick={handleMultiTextApply} className="h-auto">Apply to Sheet</Button>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleGenerateSheet} variant="outline" className="h-full">
                        Generate Sheet
                    </Button>
                    <Button onClick={() => setIsLastEntryDialogOpen(true)} variant="outline" className="h-full">
                        <History className="mr-2 h-4 w-4" />
                        Last Entry
                    </Button>
                    <Button onClick={handleClearSheet} variant="outline" size="icon" className="shrink-0 h-full">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Clear Sheet</span>
                    </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full xl:w-1/2 flex flex-col gap-4">
            <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">HARUP</h3>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Label htmlFor="harupA" className="w-8 text-center shrink-0">A</Label>
                    <Input id="harupA" placeholder="0123.." className="min-w-0" value={harupA} onChange={(e) => setHarupA(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} />
                    <Label htmlFor="harupB" className="w-8 text-center shrink-0">B</Label>
                    <Input id="harupB" placeholder="0123.." className="min-w-0" value={harupB} onChange={(e) => setHarupB(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)}/>
                    <span className="text-xl font-bold mx-2">=</span>
                    <Input id="harupAmount" placeholder="Amount" className="w-24 font-bold shrink-0" value={harupAmount} onChange={(e) => setHarupAmount(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} />
                </div>
                <div className="flex justify-end mt-2">
                    <Button onClick={handleHarupApply}>Apply</Button>
                </div>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Laddi</h3>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  <Input
                    id="laddiNum1"
                    type="text"
                    pattern="[0-9]*"
                    className="text-center min-w-0"
                    placeholder="Num 1"
                    value={laddiNum1}
                    onChange={(e) => handleLaddiNum1Change(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)}
                  />
                  <Input
                    id="laddiNum2"
                    type="text"
                    pattern="[0-9]*"
                    className="text-center min-w-0"
                    placeholder="Num 2"
                    value={laddiNum2}
                    onChange={(e) => handleLaddiNum2Change(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)}
                  />
                  <span className="text-xl font-bold mx-2">=</span>
                  <Input
                    id="amount"
                    type="text"
                    className="w-24 text-center font-bold shrink-0"
                    value={laddiAmount}
                    onChange={(e) => setLaddiAmount(e.target.value)}
                    placeholder="Amount"
                    onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                        <Checkbox id="remove-jodda" checked={removeJodda} onCheckedChange={(checked) => setRemoveJodda(Boolean(checked))} />
                        <Label htmlFor="remove-jodda" className="text-xs">Remove Jodda</Label>
                    </div>
                    <div className="text-sm font-bold text-primary">{combinationCount} Combinations</div>
                    <Button onClick={handleLaddiApply}>Apply</Button>
                </div>
            </div>
          </div>
        </CardFooter>
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

      <Dialog open={isLastEntryDialogOpen} onOpenChange={setIsLastEntryDialogOpen}>
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

    


