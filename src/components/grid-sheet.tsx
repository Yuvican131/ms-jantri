"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

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

const GRID_SIZE = 10;
const DUMMY_ACCOUNTS = "Revenue, Expenses, Assets, Liabilities, Equity, COGS"
const DUMMY_RULES = "Cell content must be a number or a standard account name. If it's a number, it can be positive or negative."

export default function GridSheet() {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [validations, setValidations] = useState<CellValidation>({})
  const [multiText, setMultiText] = useState("");
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);

  const activeSheet = sheets.find(s => s.id === activeSheetId)!

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
    const rows = Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
      Array.from({ length: GRID_SIZE }, (_, colIndex) => {
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
    for (let colIndex = 0; colIndex < GRID_SIZE; colIndex++) {
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
    for (let i = 0; i < GRID_SIZE; i++) {
      total += Number(getRowTotal(i))
    }
    return total;
  };

  const handleMultiTextApply = () => {
    const lines = multiText.split('\n');
    const newData = { ...activeSheet.data };
    const updatedCellKeys = new Set<string>();
    let updates = 0;
    
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
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      const parts = line.split('=');
      if (parts.length !== 2) return;

      const valueStr = evaluateExpression(parts[1].trim());
      const cellNumbersStr = parts[0].trim().replace(/\s+/g, '');
      
      let cellsToUpdate: {rowIndex: number, colIndex: number}[] = [];

      const pairMatch = cellNumbersStr.match(/^(\d+),(\d+)$/);
      if (pairMatch) {
        const rowIndex = parseInt(pairMatch[1], 10) - 1;
        const colIndex = parseInt(pairMatch[2], 10) - 1;
        if (rowIndex >= 0 && rowIndex < GRID_SIZE && colIndex >= 0 && colIndex < GRID_SIZE) {
            cellsToUpdate.push({rowIndex, colIndex});
        }
      } else {
        const numbers = cellNumbersStr.match(/(\d\d?)/g) || [];
        numbers.forEach(numStr => {
            const cellNum = parseInt(numStr, 10);
            if (cellNum >= 1 && cellNum <= GRID_SIZE * GRID_SIZE) {
                const rowIndex = Math.floor((cellNum - 1) / GRID_SIZE);
                const colIndex = (cellNum - 1) % GRID_SIZE;
                cellsToUpdate.push({rowIndex, colIndex});
            }
        });
      }
      
      cellsToUpdate.forEach(({rowIndex, colIndex}) => {
        const key = `${rowIndex}_${colIndex}`;
        const currentValue = parseFloat(newData[key]) || 0;
        const newValue = parseFloat(valueStr);
        
        if (!isNaN(newValue)) {
          newData[key] = String(currentValue + newValue);
        } else {
          newData[key] = valueStr;
        }

        updatedCellKeys.add(key);
        updates++;
      });
    });

    if (updates > 0) {
      const updatedSheets = sheets.map(sheet => {
        if (sheet.id === activeSheetId) {
          return { ...sheet, data: newData };
        }
        return sheet;
      });
      const currentUpdatedCells = Array.from(updatedCellKeys);
      setSheets(updatedSheets);
      setUpdatedCells(currentUpdatedCells);
      setTimeout(() => setUpdatedCells([]), 2000);
      toast({ title: "Sheet Updated", description: `${currentUpdatedCells.length} cell(s) have been updated.` });
    } else {
      toast({ title: "No Updates", description: "No valid cell data found in the input.", variant: "destructive" });
    }
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
    toast({ title: "Sheet Cleared", description: "All cell values have been reset." });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Sheet: {activeSheet.name}</CardTitle>
            <CardDescription>A 10x10 grid for your accounting data. Cells can be targeted by number (1-100) or by coordinates (row,col).</CardDescription>
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
        <div className="overflow-x-auto">
          <div className="grid grid-cols-11 gap-1" style={{gridTemplateColumns: `repeat(${GRID_SIZE + 1}, minmax(100px, 1fr))`}}>
             {/* Header for Total column */}
             <div className="col-start-1" style={{gridColumn: `span ${GRID_SIZE}`}}></div>
             <div className="flex items-center justify-center font-semibold text-muted-foreground min-w-[100px]">Total</div>
 

            {Array.from({ length: GRID_SIZE }, (_, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {Array.from({ length: GRID_SIZE }, (_, colIndex) => {
                  const cellNumber = rowIndex * GRID_SIZE + colIndex + 1
                  const key = `${rowIndex}_${colIndex}`
                  const validation = validations[key]
                  const isUpdated = updatedCells.includes(key);

                  return (
                    <div key={key} className="relative min-w-[100px]">
                      <div className="absolute top-0.5 left-1 text-xs text-muted-foreground select-none pointer-events-none z-10">{cellNumber}</div>
                      <Input
                        type="text"
                        className={`pt-5 text-sm transition-colors duration-300 ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''} ${isUpdated ? 'bg-primary/20' : ''}`}
                        value={activeSheet.data[key] || ''}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onBlur={() => handleCellBlur(rowIndex, colIndex)}
                        aria-label={`Cell ${cellNumber}`}
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
                    className="text-sm font-medium text-center"
                    value={getRowTotal(rowIndex)}
                    onChange={(e) => handleRowTotalChange(rowIndex, e.target.value)}
                    onBlur={(e) => handleRowTotalBlur(rowIndex, e.target.value)}
                    aria-label={`Row ${rowIndex + 1} Total`}
                  />
                </div>
              </React.Fragment>
            ))}
             <div style={{ gridColumn: `span ${GRID_SIZE}` }} className="flex items-center justify-end p-2 font-bold min-w-[100px] mt-1 pr-4">Total</div>
             <div className="flex items-center justify-center p-2 font-bold min-w-[100px] bg-primary/20 rounded-md mt-1">
                {calculateGrandTotal()}
              </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-4">
        <div className="w-full border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Multi - Text</h3>
          <Textarea 
            placeholder="Enter cell data like: 1=10+5, 1,1=Value1 or 11 22 33=100" 
            rows={4}
            value={multiText}
            onChange={(e) => setMultiText(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleMultiTextApply}>Apply to Sheet</Button>
            <Button onClick={handleClearSheet} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Sheet
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
