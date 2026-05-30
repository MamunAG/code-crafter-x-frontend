export type CommonWastage = {
  id: string
  name: string
  wastagePercent: number
}

export type ExtraMaterialProcess = {
  id: string
  name: string
  wastagePercent: number
  costPerKg: number
}

export type AdditionalMaterialCost = {
  id: string
  name: string
  percentage: number
  directCost: number
}

export type MaterialInput = {
  id: string
  name: string
  ratioPercent: number
  pricePerKg: number
  extraProcesses?: ExtraMaterialProcess[]
  additionalCosts?: AdditionalMaterialCost[]
}

export type ProcessInput = {
  id: string
  name: string
  costPerKg: number
}

export type FabricCostingInput = {
  targetQty: number
  currencySymbol: string
  commonWastages: CommonWastage[]
  materials: MaterialInput[]
  processes: ProcessInput[]
}

export type BreakdownRowType = "Material" | "Extra Process" | "Additional Cost" | "Process"

export type FabricCostBreakdownRow = {
  id: string
  type: BreakdownRowType
  name: string
  baseQty: number
  wastagePercent: number
  actualQty: number
  rate: number
  cost: number
  traceLines: string[]
}

export type MaterialCostResult = {
  id: string
  name: string
  ratioPercent: number
  pricePerKg: number
  baseQty: number
  actualQty: number
  rawCost: number
  extraProcessCost: number
  additionalMaterialCost: number
  totalCost: number
  totalExtraWastage: number
  extraProcesses: ExtraMaterialProcess[]
  additionalCosts: AdditionalMaterialCost[]
}

export type ProcessCostResult = {
  id: string
  name: string
  costPerKg: number
  wastagePercent: number
  cost: number
}

export type FabricCostingResult = {
  validationErrors: string[]
  input: FabricCostingInput
  totalCommonWastage: number
  requiredQty: number
  totalYarnQty: number
  totalMaterialCost: number
  totalAdditionalMaterialCost: number
  totalProcessCost: number
  finalCost: number
  materialResults: MaterialCostResult[]
  processResults: ProcessCostResult[]
  breakdownRows: FabricCostBreakdownRow[]
}

const EPSILON = 0.0001

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function equalHundred(value: number) {
  return Math.abs(value - 100) <= EPSILON
}

export const FABRIC_COSTING_SAMPLE_INPUT: FabricCostingInput = {
  targetQty: 1,
  currencySymbol: "$",
  commonWastages: [
    { id: "cw-knitting", name: "Knitting", wastagePercent: 1 },
    { id: "cw-fabric-dyeing", name: "Fabric Dyeing", wastagePercent: 12 },
  ],
  materials: [
    {
      id: "mat-yarn-1",
      name: "Yarn-1",
      ratioPercent: 95,
      pricePerKg: 3.5,
      extraProcesses: [
        {
          id: "mep-yarn-dyeing",
          name: "Yarn Dyeing",
          wastagePercent: 3,
          costPerKg: 4,
        },
      ],
      additionalCosts: [],
    },
    {
      id: "mat-yarn-2",
      name: "Yarn-2",
      ratioPercent: 5,
      pricePerKg: 12,
      extraProcesses: [],
      additionalCosts: [],
    },
  ],
  processes: [
    { id: "cp-knitting", name: "Knitting", costPerKg: 0.15 },
    { id: "cp-fabric-dyeing", name: "Fabric Dyeing", costPerKg: 6 },
  ],
}

export function calculateFabricCost(input: FabricCostingInput): FabricCostingResult {
  const validationErrors: string[] = []
  const targetQty = safeNumber(input.targetQty)

  if (targetQty <= 0) {
    validationErrors.push("Target quantity must be greater than 0.")
  }

  const totalRatio = input.materials.reduce(
    (sum, material) => sum + safeNumber(material.ratioPercent),
    0,
  )
  if (!equalHundred(totalRatio)) {
    validationErrors.push(`Total material ratio must be 100%. Current: ${totalRatio.toFixed(4)}%.`)
  }

  for (const wastage of input.commonWastages) {
    const value = safeNumber(wastage.wastagePercent)
    if (value < 0 || value >= 99) {
      validationErrors.push(`Common wastage "${wastage.name}" must be between 0 and 99.`)
    }
  }

  for (const material of input.materials) {
    if (safeNumber(material.pricePerKg) < 0) {
      validationErrors.push(`Material price for "${material.name}" cannot be negative.`)
    }
    for (const process of material.extraProcesses ?? []) {
      const wastage = safeNumber(process.wastagePercent)
      if (wastage < 0 || wastage >= 99) {
        validationErrors.push(`Extra process wastage "${process.name}" must be between 0 and 99.`)
      }
      if (safeNumber(process.costPerKg) < 0) {
        validationErrors.push(`Extra process rate for "${process.name}" cannot be negative.`)
      }
    }
    for (const additionalCost of material.additionalCosts ?? []) {
      const percentage = safeNumber(additionalCost.percentage)
      const directCost = safeNumber(additionalCost.directCost)
      if (percentage < 0 || percentage > 100) {
        validationErrors.push(`Additional cost percentage for "${additionalCost.name}" must be between 0 and 100.`)
      }
      if (directCost < 0) {
        validationErrors.push(`Additional direct cost for "${additionalCost.name}" cannot be negative.`)
      }
      if ((percentage > 0) === (directCost > 0)) {
        validationErrors.push(`Enter either a percentage or a direct cost for "${additionalCost.name}".`)
      }
    }
  }

  for (const process of input.processes) {
    if (safeNumber(process.costPerKg) < 0) {
      validationErrors.push(`Process rate for "${process.name}" cannot be negative.`)
    }
  }

  const totalCommonWastage = input.commonWastages.reduce(
    (sum, item) => sum + safeNumber(item.wastagePercent),
    0,
  )
  const commonFactor = 1 - totalCommonWastage / 100

  if (commonFactor <= 0) {
    validationErrors.push("Total common wastage must be less than 100%.")
  }

  const requiredQty = commonFactor > 0 ? targetQty / commonFactor : 0
  const breakdownRows: FabricCostBreakdownRow[] = []

  const materialResults: MaterialCostResult[] = input.materials.map((material) => {
    const extraProcesses = material.extraProcesses ?? []
    const totalExtraWastage = extraProcesses.reduce(
      (sum, process) => sum + safeNumber(process.wastagePercent),
      0,
    )
    const materialFactor = 1 - totalExtraWastage / 100
    if (materialFactor <= 0) {
      validationErrors.push(`Total extra wastage for "${material.name}" must be less than 100%.`)
    }

    const baseQty = requiredQty * (safeNumber(material.ratioPercent) / 100)
    const actualQty = materialFactor > 0 ? baseQty / materialFactor : 0
    const pricePerKg = safeNumber(material.pricePerKg)
    const rawCost = actualQty * pricePerKg
    const additionalCosts = material.additionalCosts ?? []

    breakdownRows.push({
      id: `${material.id}-raw`,
      type: "Material",
      name: `${material.name} raw`,
      baseQty,
      wastagePercent: totalExtraWastage,
      actualQty,
      rate: safeNumber(material.pricePerKg),
      cost: rawCost,
      traceLines: [
        `Required Qty = ${requiredQty.toFixed(4)} KG`,
        `${material.name} Ratio = ${safeNumber(material.ratioPercent).toFixed(4)}%`,
        `Base Qty = ${requiredQty.toFixed(4)} * ${safeNumber(material.ratioPercent).toFixed(4)}% = ${baseQty.toFixed(4)} KG`,
        `Extra Wastage = ${totalExtraWastage.toFixed(4)}%`,
        `Actual Qty = ${baseQty.toFixed(4)} / (1 - ${totalExtraWastage.toFixed(4)} / 100) = ${actualQty.toFixed(4)} KG`,
        `Raw Cost = ${actualQty.toFixed(4)} * ${safeNumber(material.pricePerKg).toFixed(4)} = ${rawCost.toFixed(2)}`,
      ],
    })

    let extraProcessCost = 0
    for (const process of extraProcesses) {
      const cost = actualQty * safeNumber(process.costPerKg)
      extraProcessCost += cost
      breakdownRows.push({
        id: `${material.id}-extra-${process.id}`,
        type: "Extra Process",
        name: process.name,
        baseQty,
        wastagePercent: safeNumber(process.wastagePercent),
        actualQty,
        rate: safeNumber(process.costPerKg),
        cost,
        traceLines: [
          `${material.name} Actual Qty = ${actualQty.toFixed(4)} KG`,
          `Rate = ${safeNumber(process.costPerKg).toFixed(4)} / KG`,
          `Cost = ${actualQty.toFixed(4)} * ${safeNumber(process.costPerKg).toFixed(4)} = ${cost.toFixed(2)}`,
        ],
      })
    }

    let additionalMaterialCost = 0
    for (const additionalCost of additionalCosts) {
      const percentage = safeNumber(additionalCost.percentage)
      const directCost = safeNumber(additionalCost.directCost)
      const cost = directCost > 0 ? directCost : pricePerKg * (percentage / 100)
      additionalMaterialCost += cost
      breakdownRows.push({
        id: `${material.id}-additional-${additionalCost.id}`,
        type: "Additional Cost",
        name: additionalCost.name,
        baseQty: actualQty,
        wastagePercent: 0,
        actualQty,
        rate: directCost > 0 ? directCost : percentage,
        cost,
        traceLines: directCost > 0
          ? [
              `${material.name} Direct Additional Cost = ${directCost.toFixed(2)}`,
              `Cost = ${cost.toFixed(2)}`,
            ]
          : [
              `${material.name} Price / KG = ${pricePerKg.toFixed(4)}`,
              `Percentage = ${percentage.toFixed(4)}%`,
              `Cost = ${pricePerKg.toFixed(4)} * ${percentage.toFixed(4)}% = ${cost.toFixed(4)}`,
            ],
      })
    }

    return {
      id: material.id,
      name: material.name,
      ratioPercent: safeNumber(material.ratioPercent),
      pricePerKg,
      baseQty,
      actualQty,
      rawCost,
      extraProcessCost,
      additionalMaterialCost,
      totalCost: rawCost + extraProcessCost + additionalMaterialCost,
      totalExtraWastage,
      extraProcesses,
      additionalCosts,
    }
  })

  const processResults: ProcessCostResult[] = input.processes.map((process) => {
    const cost = requiredQty * safeNumber(process.costPerKg)
    const wastagePercent =
      input.commonWastages.find((wastage) => wastage.name.trim() === process.name.trim())?.wastagePercent ?? 0

    breakdownRows.push({
      id: `process-${process.id}`,
      type: "Process",
      name: process.name,
      baseQty: requiredQty,
      wastagePercent: safeNumber(wastagePercent),
      actualQty: requiredQty,
      rate: safeNumber(process.costPerKg),
      cost,
      traceLines: [
        `Required Qty = ${requiredQty.toFixed(4)} KG`,
        `Rate = ${safeNumber(process.costPerKg).toFixed(4)} / KG`,
        `Cost = ${requiredQty.toFixed(4)} * ${safeNumber(process.costPerKg).toFixed(4)} = ${cost.toFixed(2)}`,
      ],
    })

    return {
      id: process.id,
      name: process.name,
      costPerKg: safeNumber(process.costPerKg),
      wastagePercent: safeNumber(wastagePercent),
      cost,
    }
  })

  const totalYarnQty = materialResults.reduce((sum, material) => sum + material.actualQty, 0)
  const totalMaterialCost = materialResults.reduce((sum, material) => sum + material.totalCost, 0)
  const totalAdditionalMaterialCost = materialResults.reduce(
    (sum, material) => sum + material.additionalMaterialCost,
    0,
  )
  const totalProcessCost = processResults.reduce((sum, process) => sum + process.cost, 0)
  const finalCost = targetQty > 0 ? (totalMaterialCost + totalProcessCost) / targetQty : 0

  return {
    validationErrors,
    input,
    totalCommonWastage,
    requiredQty,
    totalYarnQty,
    totalMaterialCost,
    totalAdditionalMaterialCost,
    totalProcessCost,
    finalCost,
    materialResults,
    processResults,
    breakdownRows,
  }
}
