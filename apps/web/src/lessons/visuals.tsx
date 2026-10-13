/**
 * The mini-lesson visual registry. Every visual is an interactive, gated widget living in
 * `interactive/`; this module owns the id union, the id-to-widget map and each caption.
 * The PEMDAS step solver stays here because both of its instances are configurations of
 * one component. Colors come from the app theme tokens (see styles.css) so the diagrams
 * follow the surrounding palette.
 */

import { type ReactNode, useState } from "react";
// D3 (Bronze Age) absolute-value inequality widgets (LIN.6).
import { AbsBandTable } from "./interactive/AbsBandTable";
// D3 (Bronze Age) absolute-value equation widgets (LIN.5).
import { AbsBranchBuilder } from "./interactive/AbsBranchBuilder";
import { AbsBranchSpot } from "./interactive/AbsBranchSpot";
import { AbsCountClassify } from "./interactive/AbsCountClassify";
import { AbsInequalityOrder } from "./interactive/AbsInequalityOrder";
import { AbsoluteValueExplore } from "./interactive/AbsoluteValueExplore";
import { AbsUnionBuilder } from "./interactive/AbsUnionBuilder";
// D6 absolute-value-function widgets (FUN.10).
import { AbsValueEvaluate } from "./interactive/AbsValueEvaluate";
import { AbsValueVeeBuild } from "./interactive/AbsValueVeeBuild";
import { AbsValueVertexSlider } from "./interactive/AbsValueVertexSlider";
import { AbsValueWalkthrough } from "./interactive/AbsValueWalkthrough";
import { AreaModelTable } from "./interactive/AreaModelTable";
// D6 average-rate-of-change widgets (FUN.5).
import { AverageRateExplore } from "./interactive/AverageRateExplore";
import { AverageRateIntervalSlider } from "./interactive/AverageRateIntervalSlider";
import { AverageRateTable } from "./interactive/AverageRateTable";
import { AverageRateWalkthrough } from "./interactive/AverageRateWalkthrough";
// D3 (Bronze Age) linear-equation widgets (LIN.1).
import { BalanceBeamSlider } from "./interactive/BalanceBeamSlider";
import { BothPansBuilder } from "./interactive/BothPansBuilder";
import { BuildFromGraphOrder } from "./interactive/BuildFromGraphOrder";
import { CombineRadicalsBuilder } from "./interactive/CombineRadicalsBuilder";
import { CommonDenominatorMultiples } from "./interactive/CommonDenominatorMultiples";
import { CommonMeasureClassify } from "./interactive/CommonMeasureClassify";
import { CommutativeAssociativePlay } from "./interactive/CommutativeAssociativePlay";
import { CompleteSquareDrag } from "./interactive/CompleteSquareDrag";
import { CompleteSquareSolver } from "./interactive/CompleteSquareSolver";
import { CompleteSquareTable } from "./interactive/CompleteSquareTable";
// D6 composition widgets (FUN.7).
import { ComposeBuild } from "./interactive/ComposeBuild";
import { ComposeEvaluate } from "./interactive/ComposeEvaluate";
import { ComposeOrderSpot } from "./interactive/ComposeOrderSpot";
import { ComposeSeriesExplore } from "./interactive/ComposeSeriesExplore";
// D3 (Bronze Age) inequality and interval widgets (LIN.4).
import { CompoundBandSorter } from "./interactive/CompoundBandSorter";
// D6 (The Gearwright's Menagerie) coordinate-plane widgets (CG.1).
import { CoordinateDistanceMidpoint } from "./interactive/CoordinateDistanceMidpoint";
import { CoordinateGridPlot } from "./interactive/CoordinateGridPlot";
import { CoordinateInterceptRead } from "./interactive/CoordinateInterceptRead";
import { CoordinateQuadrantClassify } from "./interactive/CoordinateQuadrantClassify";
// D6 difference-quotient widgets (FUN.6).
import { DifferenceQuotientBuild } from "./interactive/DifferenceQuotientBuild";
import { DifferenceQuotientCancelPlay } from "./interactive/DifferenceQuotientCancelPlay";
import { DifferenceQuotientOrder } from "./interactive/DifferenceQuotientOrder";
import { DifferenceQuotientWalkthrough } from "./interactive/DifferenceQuotientWalkthrough";
import { DifferenceSquaresDrag } from "./interactive/DifferenceSquaresDrag";
import { DiscriminantSorter } from "./interactive/DiscriminantSorter";
import { DistributeBuilder } from "./interactive/DistributeBuilder";
import { DistributeCombinePlay } from "./interactive/DistributeCombinePlay";
import { DivideRebuildBuilder } from "./interactive/DivideRebuildBuilder";
import { DivisionCheckTable } from "./interactive/DivisionCheckTable";
// D6 domain-and-range widgets (FUN.2).
import { DomainIntakeExplore } from "./interactive/DomainIntakeExplore";
import { DomainIntervalBuild } from "./interactive/DomainIntervalBuild";
import { DomainRestrictionClassify } from "./interactive/DomainRestrictionClassify";
import { EndBehaviorDescribeOrder } from "./interactive/EndBehaviorDescribeOrder";
import { EndBehaviorParitySorter } from "./interactive/EndBehaviorParitySorter";
// D8 (Exponential & Logarithmic) equation-solving widgets (EL.6).
import { EquationExtraneousSpot } from "./interactive/EquationExtraneousSpot";
import { EquationGatherConvertMatch } from "./interactive/EquationGatherConvertMatch";
import { EquationSameBaseStepper } from "./interactive/EquationSameBaseStepper";
import { EquationTakeLogWalkthrough } from "./interactive/EquationTakeLogWalkthrough";
import { EquivalentFractionPlay } from "./interactive/EquivalentFractionPlay";
// D8 (Exponential & Logarithmic) exponential-model widgets (EL.1).
import { ExpContinuousWalkthrough } from "./interactive/ExpContinuousWalkthrough";
import { ExpDecayClassify } from "./interactive/ExpDecayClassify";
import { ExpFactorSlider } from "./interactive/ExpFactorSlider";
// D8 (Exponential & Logarithmic) graph and transformation widgets (EL.2).
import { ExpFeatureLabel } from "./interactive/ExpFeatureLabel";
import { ExpGraphPlay } from "./interactive/ExpGraphPlay";
import { ExpGrowthTable } from "./interactive/ExpGrowthTable";
import { ExponentFormBuilder } from "./interactive/ExponentFormBuilder";
import { ExponentLawsBuilder } from "./interactive/ExponentLawsBuilder";
import { ExpShiftDrag } from "./interactive/ExpShiftDrag";
import { ExpTransformBuilder } from "./interactive/ExpTransformBuilder";
import { ExtremeValueOrder } from "./interactive/ExtremeValueOrder";
import { FactorPairStepper } from "./interactive/FactorPairStepper";
import { FactorPairsMatch } from "./interactive/FactorPairsMatch";
// D3 (Bronze Age) formula-rearrangement widgets (LIN.3).
import { FormulaCheckPlay } from "./interactive/FormulaCheckPlay";
import { FormulaIsolateBuilder } from "./interactive/FormulaIsolateBuilder";
import { FormulaPartsLabel } from "./interactive/FormulaPartsLabel";
import { FormulaSubjectTable } from "./interactive/FormulaSubjectTable";
import { FormulaTargetMatch } from "./interactive/FormulaTargetMatch";
import { FractionDividePlay } from "./interactive/FractionDividePlay";
import { FractionExponentLabel } from "./interactive/FractionExponentLabel";
import { FractionExponentUndoTable } from "./interactive/FractionExponentUndoTable";
import { FractionMultiplyPlay } from "./interactive/FractionMultiplyPlay";
import { FractionPartsExplore } from "./interactive/FractionPartsExplore";
// D6 function-notation and vertical-line-test widgets (FUN.1).
import { FunctionMachineEvaluate } from "./interactive/FunctionMachineEvaluate";
import { FunctionMappingClassify } from "./interactive/FunctionMappingClassify";
import { FunctionNotationLabel } from "./interactive/FunctionNotationLabel";
import { FunctionVerticalLineTest } from "./interactive/FunctionVerticalLineTest";
// D10 (Geometry) length, angle and similarity widgets (GEO.1).
import { GeoAngleExplore } from "./interactive/GeoAngleExplore";
// D10 (Geometry) area, volume and surface-area widgets (GEO.2).
import { GeoCisternPlay } from "./interactive/GeoCisternPlay";
import { GeoComposeBuilder } from "./interactive/GeoComposeBuilder";
import { GeoCordTable } from "./interactive/GeoCordTable";
import { GeoDiagonalStepper } from "./interactive/GeoDiagonalStepper";
import { GeoNetDrag } from "./interactive/GeoNetDrag";
import { GeoPavingClassify } from "./interactive/GeoPavingClassify";
import { GeoShadowSlider } from "./interactive/GeoShadowSlider";
// D6 graph-feature widgets (FUN.4).
import { GraphExtremumSpot } from "./interactive/GraphExtremumSpot";
import { GraphFeatureTable } from "./interactive/GraphFeatureTable";
import { GraphFeatureWalkthrough } from "./interactive/GraphFeatureWalkthrough";
import { GraphIntervalClassify } from "./interactive/GraphIntervalClassify";
import { GroupingOrder } from "./interactive/GroupingOrder";
import { IdentityInverseMatch } from "./interactive/IdentityInverseMatch";
import { InequalityEndpointDrag } from "./interactive/InequalityEndpointDrag";
import { InterceptRouteMatch } from "./interactive/InterceptRouteMatch";
import { IntervalPartsLabel } from "./interactive/IntervalPartsLabel";
import { IntervalWriteBuilder } from "./interactive/IntervalWriteBuilder";
// D6 inverse-function widgets (FUN.8).
import { InverseBuild } from "./interactive/InverseBuild";
import { InverseOneToOneClassify } from "./interactive/InverseOneToOneClassify";
import { InverseReflectExplore } from "./interactive/InverseReflectExplore";
import { InverseReversePlay } from "./interactive/InverseReversePlay";
import { LeadingTermDominanceTable } from "./interactive/LeadingTermDominanceTable";
import { LeadingTermMatch } from "./interactive/LeadingTermMatch";
import { LikeRadicalsSorter } from "./interactive/LikeRadicalsSorter";
import { LikeTermsClassify } from "./interactive/LikeTermsClassify";
import { LikeTermsSorter } from "./interactive/LikeTermsSorter";
// D7 (Linear Functions) write-and-graph widgets (LF.2).
import { LinearLineConvertOrder } from "./interactive/LinearLineConvertOrder";
import { LinearLineFormBuild } from "./interactive/LinearLineFormBuild";
import { LinearLineGraphPlay } from "./interactive/LinearLineGraphPlay";
import { LinearLinePairClassify } from "./interactive/LinearLinePairClassify";
// D7 (Linear Functions) modeling widgets (LF.3).
import { LinearModelClaimSpot } from "./interactive/LinearModelClaimSpot";
import { LinearModelRateExplore } from "./interactive/LinearModelRateExplore";
import { LinearModelTableBuild } from "./interactive/LinearModelTableBuild";
import { LinearModelWalkthrough } from "./interactive/LinearModelWalkthrough";
// D7 (Linear Functions) slope widgets (LF.1).
import { LinearSlopeDirectionClassify } from "./interactive/LinearSlopeDirectionClassify";
import { LinearSlopeRatioTable } from "./interactive/LinearSlopeRatioTable";
import { LinearSlopeTrianglePlay } from "./interactive/LinearSlopeTrianglePlay";
import { LinearSlopeWalkthrough } from "./interactive/LinearSlopeWalkthrough";
// D7 (Linear Functions) system widgets (LF.4).
import { LinearSystemEliminateBuild } from "./interactive/LinearSystemEliminateBuild";
import { LinearSystemGraphExplore } from "./interactive/LinearSystemGraphExplore";
import { LinearSystemSubstitutePlay } from "./interactive/LinearSystemSubstitutePlay";
import { LinearSystemWalkthrough } from "./interactive/LinearSystemWalkthrough";
// D8 (Exponential & Logarithmic) log-property widgets (EL.5).
import { LogBaseChangeWalkthrough } from "./interactive/LogBaseChangeWalkthrough";
import { LogCondenseBuilder } from "./interactive/LogCondenseBuilder";
// D8 (Exponential & Logarithmic) log-graph and domain widgets (EL.4).
import { LogDomainBuilder } from "./interactive/LogDomainBuilder";
import { LogDomainClassify } from "./interactive/LogDomainClassify";
// D8 (Exponential & Logarithmic) logarithm widgets (EL.3).
import { LogEvaluateStepper } from "./interactive/LogEvaluateStepper";
import { LogExpandOrder } from "./interactive/LogExpandOrder";
import { LogFormMatch } from "./interactive/LogFormMatch";
import { LogMirrorExplore } from "./interactive/LogMirrorExplore";
import { LogNaturalSpot } from "./interactive/LogNaturalSpot";
import { LogProductTable } from "./interactive/LogProductTable";
import { LogQuestionExplore } from "./interactive/LogQuestionExplore";
import { LogShiftSlider } from "./interactive/LogShiftSlider";
import { LongDivisionStepper } from "./interactive/LongDivisionStepper";
import { LostRootSpot } from "./interactive/LostRootSpot";
// D2 (Boomtown Square) variable-radicand widgets (RAD.4).
import { MagnitudeRootPlay } from "./interactive/MagnitudeRootPlay";
import { MixedRadicandSolver } from "./interactive/MixedRadicandSolver";
import { MultiplicityCrossSorter } from "./interactive/MultiplicityCrossSorter";
import { NegativeExponentEstimate } from "./interactive/NegativeExponentEstimate";
import { NegativeExponentOrder } from "./interactive/NegativeExponentOrder";
import { NegativeExponentPlay } from "./interactive/NegativeExponentPlay";
import { NegativeFlipPlay } from "./interactive/NegativeFlipPlay";
import { OffStandardStepper } from "./interactive/OffStandardStepper";
import { OrderMattersPlay } from "./interactive/OrderMattersPlay";
import { ParabolaOpeningSorter } from "./interactive/ParabolaOpeningSorter";
import { PemdasKeyExplore } from "./interactive/PemdasKeyExplore";
import { PemdasMnemonicExplore } from "./interactive/PemdasMnemonicExplore";
import { PercentSlider } from "./interactive/PercentSlider";
// D2 (Boomtown Square) radical + rational-exponent widgets (RAD.1 / RAD.2 / RAD.3).
import { PerfectRootClassify } from "./interactive/PerfectRootClassify";
import { PerfectSquareFactorMatch } from "./interactive/PerfectSquareFactorMatch";
import { PerfectSquareSorter } from "./interactive/PerfectSquareSorter";
// D6 piecewise widgets (FUN.3).
import { PiecewiseBoundaryPlay } from "./interactive/PiecewiseBoundaryPlay";
import { PiecewiseEvaluate } from "./interactive/PiecewiseEvaluate";
import { PiecewiseGraphBuild } from "./interactive/PiecewiseGraphBuild";
import { PiecewisePieceSelect } from "./interactive/PiecewisePieceSelect";
import { PolynomialPartsLabel } from "./interactive/PolynomialPartsLabel";
import { PositiveExponentSolver } from "./interactive/PositiveExponentSolver";
import { PowerOfPowerMatch } from "./interactive/PowerOfPowerMatch";
import { PowerOfPowerWalkthrough } from "./interactive/PowerOfPowerWalkthrough";
import { PowerPartsLabel } from "./interactive/PowerPartsLabel";
import { ProportionCrossPlay } from "./interactive/ProportionCrossPlay";
import { RadicalFactorBuilder } from "./interactive/RadicalFactorBuilder";
import { RadicalFormBuilder } from "./interactive/RadicalFormBuilder";
import { RadicalPartsLabel } from "./interactive/RadicalPartsLabel";
import { RadicalQuotientSorter } from "./interactive/RadicalQuotientSorter";
import { RangeOutputRead } from "./interactive/RangeOutputRead";
// D5 (Verdigris Hold) rational add/subtract widgets (RAT.3).
import { RationalAddLcdBuilder } from "./interactive/RationalAddLcdBuilder";
import { RationalAddWalkthrough } from "./interactive/RationalAddWalkthrough";
// D5 (Verdigris Hold) complex/nested rational widgets (RAT.4, the Master-Recipe Board).
import { RationalClearLcdBuilder } from "./interactive/RationalClearLcdBuilder";
// D5 (Verdigris Hold) solve-and-reject widgets (RAT.6, the Proving Cauldron).
import { RationalClearMeasureWalkthrough } from "./interactive/RationalClearMeasureWalkthrough";
import { RationalCombinedRateBuild } from "./interactive/RationalCombinedRateBuild";
import { RationalCursedRootClassify } from "./interactive/RationalCursedRootClassify";
// D5 (Verdigris Hold) multiply/divide widgets (RAT.2).
import { RationalDivideDoseSorter } from "./interactive/RationalDivideDoseSorter";
// D5 (Verdigris Hold) graph-and-analyze widgets (RAT.5, the Assay Spire).
import { RationalEndBehaviorTable } from "./interactive/RationalEndBehaviorTable";
// D5 (Verdigris Hold) simplify + excluded-value widgets (RAT.1).
import { RationalExclusionClassify } from "./interactive/RationalExclusionClassify";
import { RationalExponentPlay } from "./interactive/RationalExponentPlay";
import { RationalForbiddenDoseExplore } from "./interactive/RationalForbiddenDoseExplore";
import { RationalGaugeDomainExplore } from "./interactive/RationalGaugeDomainExplore";
import { RationalHoleAsymptotePlay } from "./interactive/RationalHoleAsymptotePlay";
import { RationalInterceptWalkthrough } from "./interactive/RationalInterceptWalkthrough";
import { RationalizeExplore } from "./interactive/RationalizeExplore";
import { RationalizeSolver } from "./interactive/RationalizeSolver";
import { RationalNestedBarPlay } from "./interactive/RationalNestedBarPlay";
import { RationalNestedDoseSorter } from "./interactive/RationalNestedDoseSorter";
import { RationalNestedFlipSpot } from "./interactive/RationalNestedFlipSpot";
import { RationalNumericTwinMatch } from "./interactive/RationalNumericTwinMatch";
import { RationalPowerSolver } from "./interactive/RationalPowerSolver";
import { RationalProvingRunSolver } from "./interactive/RationalProvingRunSolver";
import { RationalReciprocalWalkthrough } from "./interactive/RationalReciprocalWalkthrough";
import { RationalReducePlay } from "./interactive/RationalReducePlay";
import { RationalScaleCancelPlay } from "./interactive/RationalScaleCancelPlay";
import { RationalScaleDoseExplore } from "./interactive/RationalScaleDoseExplore";
import { RationalSimplifyOrder } from "./interactive/RationalSimplifyOrder";
import { RationalSubtractSignPlay } from "./interactive/RationalSubtractSignPlay";
import { RemainderEstimate } from "./interactive/RemainderEstimate";
import { RootParityBuilder } from "./interactive/RootParityBuilder";
import { SignedAdditionWalkthrough } from "./interactive/SignedAdditionWalkthrough";
import { SignRulesTable } from "./interactive/SignRulesTable";
import { SimplifyRadicalSolver } from "./interactive/SimplifyRadicalSolver";
import { SolveQuadraticOrder } from "./interactive/SolveQuadraticOrder";
import { SolveSlipSpot } from "./interactive/SolveSlipSpot";
import { SolveStepsOrder } from "./interactive/SolveStepsOrder";
import { SqrtSquareSpot } from "./interactive/SqrtSquareSpot";
import { SquareSideSolver } from "./interactive/SquareSideSolver";
import { StandardFormBuilder } from "./interactive/StandardFormBuilder";
import { StoneOrderSorter } from "./interactive/StoneOrderSorter";
import { SubtractAsAddPlay } from "./interactive/SubtractAsAddPlay";
import { SubtractSignSpot } from "./interactive/SubtractSignSpot";
import { SyntheticLongMatch } from "./interactive/SyntheticLongMatch";
import { TolerancePassSorter } from "./interactive/TolerancePassSorter";
// D6 transformation and even/odd widgets (FUN.9).
import { TransformOrder } from "./interactive/TransformOrder";
import { TransformParityClassify } from "./interactive/TransformParityClassify";
import { TransformShiftSlider } from "./interactive/TransformShiftSlider";
import { TransformStretchExplore } from "./interactive/TransformStretchExplore";
// D9 (Trigonometry) sine and cosine graph widgets (TRG.5).
import { TrigAmplitudeSlider } from "./interactive/TrigAmplitudeSlider";
// D9 (Trigonometry) tangent and reciprocal graph widgets (TRG.6).
import { TrigAsymptoteTable } from "./interactive/TrigAsymptoteTable";
// D9 (Trigonometry) angle-measure widgets (TRG.1).
import { TrigBearingTable } from "./interactive/TrigBearingTable";
// D9 (Trigonometry) right-triangle ratio widgets (TRG.2).
import { TrigCofunctionSpot } from "./interactive/TrigCofunctionSpot";
// D9 (Trigonometry) sum, difference and double-angle widgets (TRG.9).
import { TrigCombineEstimate } from "./interactive/TrigCombineEstimate";
// D9 (Trigonometry) inverse-function widgets (TRG.7).
import { TrigComposeSorter } from "./interactive/TrigComposeSorter";
import { TrigConvertSpot } from "./interactive/TrigConvertSpot";
import { TrigCoterminalSorter } from "./interactive/TrigCoterminalSorter";
import { TrigCycleMatch } from "./interactive/TrigCycleMatch";
import { TrigDoubleMatch } from "./interactive/TrigDoubleMatch";
// D9 (Trigonometry) six-function and identity widgets (TRG.4).
import { TrigEvenOddSorter } from "./interactive/TrigEvenOddSorter";
import { TrigFeatureLabel } from "./interactive/TrigFeatureLabel";
import { TrigGuyWireLabel } from "./interactive/TrigGuyWireLabel";
import { TrigIdentitySpot } from "./interactive/TrigIdentitySpot";
import { TrigInverseEstimate } from "./interactive/TrigInverseEstimate";
import { TrigInverseOrder } from "./interactive/TrigInverseOrder";
import { TrigPeriodTable } from "./interactive/TrigPeriodTable";
import { TrigPhaseDrag } from "./interactive/TrigPhaseDrag";
// D9 (Trigonometry) unit-circle and reference-angle widgets (TRG.3).
import { TrigQuadrantSorter } from "./interactive/TrigQuadrantSorter";
import { TrigRadianMatch } from "./interactive/TrigRadianMatch";
import { TrigRangeLabel } from "./interactive/TrigRangeLabel";
import { TrigRatioTable } from "./interactive/TrigRatioTable";
import { TrigReciprocalMatch } from "./interactive/TrigReciprocalMatch";
import { TrigReferenceOrder } from "./interactive/TrigReferenceOrder";
import { TrigReferenceTable } from "./interactive/TrigReferenceTable";
// D9 (Trigonometry) equation-solving widgets (TRG.8).
import { TrigRosterSpot } from "./interactive/TrigRosterSpot";
import { TrigSecantSorter } from "./interactive/TrigSecantSorter";
import { TrigShortenOrder } from "./interactive/TrigShortenOrder";
import { TrigSixTable } from "./interactive/TrigSixTable";
import { TrigSolveOrder } from "./interactive/TrigSolveOrder";
import { TrigSpecialMatch } from "./interactive/TrigSpecialMatch";
import { TrigSumTable } from "./interactive/TrigSumTable";
import { TrigSweepPlay } from "./interactive/TrigSweepPlay";
import { TrigTangentExplore } from "./interactive/TrigTangentExplore";
import { TrigUnitCircleExplore } from "./interactive/TrigUnitCircleExplore";
import { TrigWindowSorter } from "./interactive/TrigWindowSorter";
import { TurningPointsEstimate } from "./interactive/TurningPointsEstimate";
import { UnitConversionSpot } from "./interactive/UnitConversionSpot";
import { UnitRatePlay } from "./interactive/UnitRatePlay";
import { UnlikeBaseSpot } from "./interactive/UnlikeBaseSpot";
import { UnlikeSumTable } from "./interactive/UnlikeSumTable";
import { VariableRadicandBuilder } from "./interactive/VariableRadicandBuilder";
import { VertexFormReadTable } from "./interactive/VertexFormReadTable";
import { ZeroExponentTable } from "./interactive/ZeroExponentTable";
import { ZeroProductPlay } from "./interactive/ZeroProductPlay";
import { ZerosFromFactorsTable } from "./interactive/ZerosFromFactorsTable";
import { LessonProse } from "./prose";
import {
  BRICK,
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  PEMDAS,
  type PemdasRole,
  SIGNAL,
  SOFT,
  SvgMath,
  stackGapMid,
} from "./svgKit";
import { WidgetFeedbackHost } from "./widgetFeedback";
import { type LessonWidgetProps, useWidgetSuccess } from "./widgetMechanics";

// Re-export the shared primitives so existing importers (e.g. workedSolutionVisuals)
// and interactive widgets can keep importing them from here if they prefer.
export {
  BRICK,
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  PEMDAS,
  type PemdasRole,
  SIGNAL,
  SOFT,
  SvgMath,
  stackGapMid,
};

export type LessonVisualId =
  | "pemdas-solver"
  | "pemdas-solver-ltr"
  | "distribute-builder"
  | "like-terms-sorter"
  | "percent-slider"
  | "pemdas-key-explore"
  | "pemdas-mnemonic-explore"
  | "order-matters-play"
  | "commutative-associative-play"
  | "identity-inverse-match"
  | "like-terms-classify"
  | "distribute-combine-play"
  | "unit-rate-play"
  | "proportion-cross-play"
  | "unit-conversion-spot"
  | "fraction-parts-explore"
  | "equivalent-fraction-play"
  | "common-denominator-multiples"
  | "fraction-multiply-play"
  | "fraction-divide-play"
  | "absolute-value-explore"
  | "signed-addition-walkthrough"
  | "subtract-as-add-play"
  | "sign-rules-table"
  // D2 (Boomtown Square) exponent-law widgets.
  | "power-parts-label"
  | "exponent-laws-builder"
  | "power-of-power-walkthrough"
  | "power-of-power-match"
  | "zero-exponent-table"
  | "negative-exponent-estimate"
  | "negative-exponent-play"
  | "positive-exponent-solver"
  | "unlike-base-spot"
  // Registered but no longer mounted by any lesson: EXP.1's negative-exponent slide dropped
  // the product-rule derivation this builds, and `negative-exponent-play` took its slot. Kept
  // because the ordering kind behind it is still the right shape for a real derivation, and it
  // is the only board in the interaction-kind sweeps whose goal line carries typeset math.
  | "negative-exponent-order"
  // D2 (Boomtown Square) radical + rational-exponent widgets.
  | "radical-parts-label"
  | "perfect-root-classify"
  | "perfect-square-factor-match"
  | "radical-factor-builder"
  | "simplify-radical-solver"
  | "radical-quotient-sorter"
  | "like-radicals-sorter"
  | "unlike-sum-table"
  | "combine-radicals-builder"
  | "rationalize-solver"
  | "rationalize-explore"
  | "rational-exponent-play"
  | "fraction-exponent-label"
  | "fraction-exponent-undo-table"
  | "radical-form-builder"
  | "exponent-form-builder"
  | "rational-power-solver"
  // D2 (Boomtown Square) variable-radicand widgets.
  | "magnitude-root-play"
  | "sqrt-square-spot"
  | "root-parity-builder"
  | "variable-radicand-builder"
  | "mixed-radicand-solver"
  // D5 (Verdigris Hold) simplify + excluded-value widgets.
  | "rational-forbidden-dose-explore"
  | "rational-reduce-play"
  | "rational-exclusion-classify"
  | "rational-simplify-order"
  // D5 (Verdigris Hold) multiply/divide widgets.
  | "rational-scale-cancel-play"
  | "rational-scale-dose-explore"
  | "rational-reciprocal-walkthrough"
  | "rational-divide-dose-sorter"
  // D5 (Verdigris Hold) rational add/subtract widgets.
  | "rational-numeric-twin-match"
  | "rational-add-lcd-builder"
  | "rational-add-walkthrough"
  | "rational-subtract-sign-play"
  // D5 (Verdigris Hold) complex/nested rational widgets (RAT.4).
  | "rational-nested-bar-play"
  | "rational-nested-flip-spot"
  | "rational-clear-lcd-builder"
  | "rational-nested-dose-sorter"
  // D5 (Verdigris Hold) solve-and-reject widgets (RAT.6).
  | "rational-clear-measure-walkthrough"
  | "rational-combined-rate-build"
  | "rational-cursed-root-classify"
  | "rational-proving-run-solver"
  // D5 (Verdigris Hold) graph-and-analyze widgets (RAT.5).
  | "rational-gauge-domain-explore"
  | "rational-hole-asymptote-play"
  | "rational-intercept-walkthrough"
  | "rational-end-behavior-table"
  // D7 (Linear Functions) slope widgets (LF.1).
  | "linear-slope-ratio-table"
  | "linear-slope-triangle-play"
  | "linear-slope-direction-classify"
  | "linear-slope-walkthrough"
  // D7 (Linear Functions) write-and-graph widgets (LF.2).
  | "linear-line-form-build"
  | "linear-line-graph-play"
  | "linear-line-pair-classify"
  | "linear-line-convert-order"
  // D7 (Linear Functions) modeling widgets (LF.3).
  | "linear-model-rate-explore"
  | "linear-model-table-build"
  | "linear-model-claim-spot"
  | "linear-model-walkthrough"
  // D7 (Linear Functions) system widgets (LF.4).
  | "linear-system-graph-explore"
  | "linear-system-substitute-play"
  | "linear-system-eliminate-build"
  | "linear-system-walkthrough"
  // D8 (Exponential & Logarithmic) exponential-model widgets (EL.1).
  | "exp-growth-table"
  | "exp-factor-slider"
  | "exp-decay-classify"
  | "exp-continuous-walkthrough"
  // D8 (Exponential & Logarithmic) graph and transformation widgets (EL.2).
  | "exp-graph-play"
  | "exp-shift-drag"
  | "exp-transform-builder"
  | "exp-feature-label"
  // D8 (Exponential & Logarithmic) logarithm widgets (EL.3).
  | "log-question-explore"
  | "log-form-match"
  | "log-evaluate-stepper"
  | "log-natural-spot"
  // D8 (Exponential & Logarithmic) log-graph and domain widgets (EL.4).
  | "log-mirror-explore"
  | "log-domain-classify"
  | "log-shift-slider"
  | "log-domain-builder"
  // D8 (Exponential & Logarithmic) log-property widgets (EL.5).
  | "log-product-table"
  | "log-expand-order"
  | "log-condense-builder"
  | "log-base-change-walkthrough"
  // D8 (Exponential & Logarithmic) equation-solving widgets (EL.6).
  | "equation-same-base-stepper"
  | "equation-take-log-walkthrough"
  | "equation-gather-convert-match"
  | "equation-extraneous-spot"
  // D9 (Trigonometry) angle-measure widgets (TRG.1).
  | "trg-bearing-table"
  | "trg-radian-match"
  | "trg-coterminal-sorter"
  | "trg-convert-spot"
  // D9 (Trigonometry) right-triangle ratio widgets (TRG.2).
  | "trg-guywire-label"
  | "trg-ratio-table"
  | "trg-special-match"
  | "trg-cofunction-spot"
  // D9 (Trigonometry) unit-circle and reference-angle widgets (TRG.3).
  | "trg-unitcircle-explore"
  | "trg-quadrant-sorter"
  | "trg-reference-table"
  | "trg-reference-order"
  // D9 (Trigonometry) six-function and identity widgets (TRG.4).
  | "trg-six-table"
  | "trg-reciprocal-match"
  | "trg-evenodd-sorter"
  | "trg-identity-spot"
  // D9 (Trigonometry) sine and cosine graph widgets (TRG.5).
  | "trg-amplitude-slider"
  | "trg-period-table"
  | "trg-phase-drag"
  | "trg-feature-label"
  // D9 (Trigonometry) tangent and reciprocal graph widgets (TRG.6).
  | "trg-tangent-explore"
  | "trg-asymptote-table"
  | "trg-secant-sorter"
  | "trg-cycle-match"
  // D9 (Trigonometry) inverse-function widgets (TRG.7).
  | "trg-inverse-order"
  | "trg-range-label"
  | "trg-compose-sorter"
  | "trg-inverse-estimate"
  // D9 (Trigonometry) equation-solving widgets (TRG.8).
  | "trg-sweep-play"
  | "trg-solve-order"
  | "trg-roster-spot"
  | "trg-window-sorter"
  // D9 (Trigonometry) sum, difference and double-angle widgets (TRG.9).
  | "trg-combine-estimate"
  | "trg-sum-table"
  | "trg-double-match"
  | "trg-shorten-order"
  // D10 (Geometry) length, angle and similarity widgets (GEO.1).
  | "geo-cord-table"
  | "geo-diagonal-stepper"
  | "geo-angle-explore"
  | "geo-shadow-slider"
  // D10 (Geometry) area, volume and surface-area widgets (GEO.2).
  | "geo-paving-classify"
  | "geo-compose-builder"
  | "geo-cistern-play"
  | "geo-net-drag"
  // D3 (Bronze Age) linear-equation widgets (LIN.1).
  | "balance-beam-slider"
  | "solve-steps-order"
  | "both-pans-builder"
  | "solve-slip-spot"
  // D3 (Bronze Age) formula-rearrangement widgets (LIN.3).
  | "formula-target-match"
  | "formula-subject-table"
  | "formula-isolate-builder"
  | "formula-check-play"
  // D3 (Bronze Age) inequality and interval widgets (LIN.4).
  | "inequality-endpoint-drag"
  | "negative-flip-play"
  | "interval-parts-label"
  | "compound-band-sorter"
  | "interval-write-builder"
  // D3 (Bronze Age) absolute-value equation widgets (LIN.5).
  | "off-standard-stepper"
  | "abs-branch-builder"
  | "abs-branch-spot"
  | "abs-count-classify"
  // D3 (Bronze Age) absolute-value inequality widgets (LIN.6).
  | "tolerance-pass-sorter"
  | "abs-band-table"
  | "abs-union-builder"
  | "abs-inequality-order"
  // D4 (Classical) polynomial-arithmetic widgets (POL.1).
  | "polynomial-parts-label"
  | "stone-pieces-sorter"
  | "subtract-sign-spot"
  | "area-model-table"
  | "standard-form-builder"
  // D4 (Classical) factoring widgets (POL.2).
  | "factor-pairs-match"
  | "common-measure-classify"
  | "factor-pair-stepper"
  | "difference-squares-drag"
  | "perfect-square-sorter"
  | "grouping-order"
  // D4 (Classical) quadratic-solving widgets (POL.3).
  | "square-side-solver"
  | "zero-product-play"
  | "solve-quadratic-order"
  | "lost-root-spot"
  // D4 (Classical) completing-the-square and formula widgets (POL.4).
  | "complete-square-drag"
  | "complete-square-table"
  | "complete-square-solver"
  | "formula-parts-label"
  | "discriminant-sorter"
  // D4 (Classical) polynomial-division widgets (POL.8).
  | "divide-rebuild-builder"
  | "long-division-stepper"
  | "division-check-table"
  | "synthetic-long-match"
  | "remainder-estimate"
  // D4 (Early Modern) polynomial graph-reading widgets (POL.6, POL.7). The domain spans two
  // eras: these two nodes moved to Early Modern with the coordinate plane, and they were
  // authored to move the diagnostic's placement horizon past the sixth era.
  | "leading-term-dominance-table"
  | "leading-term-match"
  | "end-behavior-parity-sorter"
  | "end-behavior-describe-order"
  | "zeros-from-factors-table"
  | "multiplicity-cross-sorter"
  | "turning-points-estimate"
  | "build-from-graph-order"
  // POL.5, the Industrial era's polynomial node and the last one in the product to be
  // authored: the parabola's turning point, its intercepts and which of the two extremes
  // it carries.
  | "parabola-opening-sorter"
  | "vertex-form-read-table"
  | "extreme-value-order"
  | "intercept-route-match"
  // D6 (The Gearwright's Menagerie) coordinate-plane widgets (CG.1).
  | "coordinate-plot-stepper"
  | "coordinate-quadrant-classify"
  | "coordinate-intercept-builder"
  | "coordinate-distance-walkthrough"
  // D6 function-notation and vertical-line-test widgets (FUN.1).
  | "function-machine-solver"
  | "function-notation-label"
  | "function-vertical-line-slider"
  | "function-mapping-classify"
  // D6 domain-and-range widgets (FUN.2).
  | "domain-intake-explore"
  | "domain-range-slider"
  | "domain-restriction-classify"
  | "domain-interval-build"
  // D6 piecewise widgets (FUN.3).
  | "piecewise-piece-classify"
  | "piecewise-evaluate-solver"
  | "piecewise-boundary-play"
  | "piecewise-graph-build"
  // D6 graph-feature widgets (FUN.4).
  | "feature-interval-classify"
  | "feature-extremum-spot"
  | "feature-trace-walkthrough"
  | "feature-table"
  // D6 average-rate-of-change widgets (FUN.5).
  | "rate-average-explore"
  | "rate-walkthrough"
  | "rate-table"
  | "rate-interval-slider"
  // D6 difference-quotient widgets (FUN.6).
  | "quotient-build"
  | "quotient-expand-walkthrough"
  | "quotient-cancel-play"
  | "quotient-order"
  // D6 composition widgets (FUN.7).
  | "compose-series-explore"
  | "compose-evaluate-solver"
  | "compose-order-spot"
  | "compose-build"
  // D6 inverse-function widgets (FUN.8).
  | "inverse-reverse-play"
  | "inverse-build"
  | "inverse-one-to-one-classify"
  | "inverse-reflect-explore"
  // D6 transformation and even/odd widgets (FUN.9).
  | "transform-shift-slider"
  | "transform-stretch-explore"
  | "transform-parity-classify"
  | "transform-order"
  // D6 absolute-value-function widgets (FUN.10).
  | "absvalue-vee-build"
  | "absvalue-vertex-slider"
  | "absvalue-evaluate-stepper"
  | "absvalue-walkthrough";

/**
 * Interactive order-of-operations solver. The learner drives the reduction of
 * `2 × (1 + 3)² − 5`: at each step they pick which PEMDAS tier to apply. A correct
 * pick reveals the next reduced row; a wrong pick shows a nudge. When the final
 * value (27) is reached the widget calls `onComplete`, which the lesson uses to
 * gate the "Next" button.
 */
interface SolverStep {
  /** The tier the learner must pick to turn the previous row into this one. */
  tier: PemdasRole;
  tokens: EqToken[];
  /** LaTeX for the produced row's chip; defaults to the tier glyph in SOLVER_APPLIED. */
  chip?: string;
}

interface SolverConfig {
  start: EqToken[];
  steps: SolverStep[];
  /** SVG aria-label describing the whole reduction. */
  ariaLabel: string;
  /** SVG <title>. */
  title: string;
  /** Status line shown once the final value is reached. */
  solvedText: ReactNode;
}

/**
 * Operators get their own token so `EquationRow`'s gap falls on both sides of them.
 * Glued to an operand (`2 \times`) KaTeX would render the pair tight and push the gap
 * past the operator.
 */
const TIMES_OP: EqToken = { text: "\\times", role: "muldiv" };
const MINUS_OP: EqToken = { text: "-", role: "addsub" };

const SOLVER_START: EqToken[] = [
  { text: "2", role: "muldiv" },
  TIMES_OP,
  { text: "(1 + 3)", role: "paren" },
  // An empty base so the exponent can carry its own tier color, glued to the parentheses.
  { text: "{}", role: "exp", sup: "2", tight: true },
  MINUS_OP,
  { text: "5", role: "addsub" },
];

const SOLVER_STEPS: SolverStep[] = [
  {
    tier: "paren",
    tokens: [
      { text: "2", role: "muldiv" },
      TIMES_OP,
      { text: "4", role: "exp", sup: "2" },
      MINUS_OP,
      { text: "5", role: "addsub" },
    ],
  },
  {
    tier: "exp",
    tokens: [
      { text: "2 \\times 16", role: "muldiv" },
      MINUS_OP,
      { text: "5", role: "addsub" },
    ],
  },
  {
    tier: "muldiv",
    tokens: [{ text: "32 - 5", role: "addsub" }],
  },
  {
    tier: "addsub",
    tokens: [{ text: "27" }],
  },
];

const DEFAULT_SOLVER: SolverConfig = {
  start: SOLVER_START,
  steps: SOLVER_STEPS,
  ariaLabel: "Evaluate 2 times (1 plus 3) squared minus 5 one tier at a time",
  title: "Order of operations, one tier at a time",
  solvedText: (
    <>
      Nice work. One tier at a time brought us all the way to <InlineMath latex="27" />.
    </>
  ),
};

// Left-to-right WITHIN a tier: 20 ÷ 4 × 2 − 7 + 1. The ×/÷ tier holds two ops (apply ÷
// then ×, left to right → 5 × 2 → 10) and the +/− tier holds two (apply − then +, left
// to right → 3 + 1 → 4). Same-tier ops are worked left to right, NOT by which symbol
// "looks" higher (÷ is not below ×, − is not below +). Final value 4.
const SOLVER_START_LTR: EqToken[] = [
  { text: "20 \\div 4 \\times 2", role: "muldiv" },
  MINUS_OP,
  { text: "7 + 1", role: "addsub" },
];

const SOLVER_STEPS_LTR: SolverStep[] = [
  {
    tier: "muldiv",
    chip: "\\div",
    tokens: [
      { text: "5 \\times 2", role: "muldiv" },
      MINUS_OP,
      { text: "7 + 1", role: "addsub" },
    ],
  },
  {
    tier: "muldiv",
    chip: "\\times",
    tokens: [{ text: "10 - 7 + 1", role: "addsub" }],
  },
  {
    tier: "addsub",
    chip: "-",
    tokens: [{ text: "3 + 1", role: "addsub" }],
  },
  {
    tier: "addsub",
    chip: "+",
    tokens: [{ text: "4" }],
  },
];

const LTR_SOLVER: SolverConfig = {
  start: SOLVER_START_LTR,
  steps: SOLVER_STEPS_LTR,
  ariaLabel:
    "Evaluate 20 divided by 4 times 2 minus 7 plus 1, working left to right within each tier",
  title: "Left to right within a tier",
  solvedText: (
    <>
      Left to right within a tier: <InlineMath latex="20 \div 4 \times 2 = 10" />, then{" "}
      <InlineMath latex="10 - 7 + 1 = 4" />.
    </>
  ),
};

/** Tier buttons the learner taps (matches the PEMDAS key ordering). */
const SOLVER_TIERS: { role: PemdasRole; symbol: string; label: string }[] = [
  { role: "paren", symbol: "(\\;)", label: "Parentheses" },
  { role: "exp", symbol: "x^{n}", label: "Exponents" },
  { role: "muldiv", symbol: "\\times \\; \\div", label: "Multiply / Divide" },
  { role: "addsub", symbol: "+ \\; -", label: "Add / Subtract" },
];

/** Compact chip glyph shown to the left of each produced row (the tier applied). */
const SOLVER_APPLIED: Record<PemdasRole, string> = {
  paren: "(\\;)",
  exp: "x^{n}",
  muldiv: "\\times",
  addsub: "-",
};

/** Plain-language tier names used in the solver's feedback messages. */
const SOLVER_TIER_LABEL: Record<PemdasRole, string> = {
  paren: "parentheses",
  exp: "exponents",
  muldiv: "multiplication and division",
  addsub: "addition and subtraction",
};

/** Fisher-Yates shuffle returning a new array (so the tier buttons aren't in PEMDAS order). */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function PemdasStepSolver({
  onComplete,
  config = DEFAULT_SOLVER,
}: {
  onComplete?: () => void;
  config?: SolverConfig;
}) {
  const { start, steps, ariaLabel, title, solvedText } = config;
  const [revealed, setRevealed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Randomized tier-button order so tapping top-to-bottom isn't trivially correct.
  const [tiers, setTiers] = useState(() => shuffle(SOLVER_TIERS));
  const success = useWidgetSuccess();

  const solved = revealed >= steps.length;
  const nextTier = solved ? null : (steps[revealed]?.tier ?? null);

  function pick(role: PemdasRole) {
    if (solved) {
      return;
    }
    if (role === nextTier) {
      setFeedback(null);
      const next = revealed + 1;
      setRevealed(next);
      success();
      if (next >= steps.length && !done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    // Wrong tap: explain based on where the tapped tier sits in precedence.
    const applied = new Set(steps.slice(0, revealed).map((s) => s.tier));
    const remaining = steps.slice(revealed).map((s) => s.tier);
    const label = SOLVER_TIER_LABEL[role];
    if (applied.has(role)) {
      setFeedback(`You already handled ${label}. Look for the next tier down.`);
    } else if (!remaining.includes(role)) {
      setFeedback(`There is no ${label} to do in this expression.`);
    } else {
      setFeedback("Not yet. Clear the higher-priority tier still in the expression first.");
    }
  }

  function reset() {
    setRevealed(0);
    setFeedback(null);
    setTiers(shuffle(SOLVER_TIERS));
  }

  const rows: {
    tokens: EqToken[];
    tier?: PemdasRole;
    chip?: string;
  }[] = [
    { tokens: start },
    ...steps.slice(0, revealed).map((s) => ({
      tokens: s.tokens,
      tier: s.tier,
      chip: s.chip,
    })),
  ];

  const cx = 220;
  const top = 30;
  const rowH = 44;
  const chipX = 26;
  const chipW = 44;
  const chipH = 26;
  const height = top + (rows.length - 1) * rowH + 28;

  return (
    <div className="pemdas-solver">
      <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
        <title>{title}</title>
        {rows.map((row, index) => {
          const y = top + index * rowH;
          const fontSize = 20;
          const yPrev = top + (index - 1) * rowH;
          const gapMid = stackGapMid(yPrev, y);
          const color = row.tier ? PEMDAS[row.tier] : undefined;
          const chip = row.chip ?? (row.tier ? SOLVER_APPLIED[row.tier] : undefined);
          // Centered on the row: EquationRow centers its math on `y` rather than
          // sitting a baseline there, so the chip needs no ascent nudge.
          const chipY = y - chipH / 2;
          return (
            <g key={row.tokens.map((t) => `${t.text}${t.sup ?? ""}`).join("|")}>
              {row.tier && color && chip && (
                <g>
                  <rect
                    x={chipX}
                    y={chipY}
                    width={chipW}
                    height={chipH}
                    rx={7}
                    fill={color}
                    fillOpacity={0.16}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <SvgMath
                    latex={chip}
                    x={chipX + chipW / 2}
                    y={chipY + chipH / 2}
                    fontSize={14}
                    color={color}
                    w={chipW * 2}
                  />
                </g>
              )}
              {index > 0 && (
                <text
                  x={cx}
                  y={gapMid}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fill={LINE}
                >
                  &#8595;
                </text>
              )}
              <EquationRow cx={cx} y={y} fontSize={fontSize} tokens={row.tokens} />
            </g>
          );
        })}
      </svg>

      <p
        className="pemdas-solver__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved
          ? solvedText
          : (feedback ?? "Which operation comes next? Tap a tier to apply it.")}
      </p>

      {solved ? (
        <button type="button" className="pemdas-solver__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        <div className="pemdas-solver__chips">
          {tiers.map((tier) => (
            <button
              key={tier.role}
              type="button"
              className="pemdas-solver__chip"
              style={{ color: PEMDAS[tier.role], borderColor: PEMDAS[tier.role] }}
              onClick={() => pick(tier.role)}
            >
              <span className="pemdas-solver__chip-symbol">
                <InlineMath latex={tier.symbol} />
              </span>
              <span className="pemdas-solver__chip-label">{tier.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Second solver instance (NUM.2): a left-to-right expression where two operations share a
 * tier, so the learner must apply same-tier ops left to right rather than by symbol.
 */
function PemdasStepSolverLtr({ onComplete }: { onComplete?: () => void }) {
  return <PemdasStepSolver onComplete={onComplete} config={LTR_SOLVER} />;
}

const REGISTRY: Record<
  LessonVisualId,
  {
    Svg: React.ComponentType<LessonWidgetProps>;
    /**
     * Markdown, with any math in `$...$` — it renders through `LessonProse`.
     *
     * OMIT IT on an interactive widget whose own status line already states the task.
     * A caption that restates the widget's prompt puts two instructions on screen for one
     * job, which is the single most common complaint QA raised against these lessons: the
     * learner reads "Same base means you add the exponents. Enter the combined exponent."
     * and then, directly underneath, "Combine two powers with the same base by adding
     * their exponents." A caption earns its place only when it says something the widget
     * does not, and a widget that needs a caption to explain itself needs a better status
     * line instead.
     */
    caption?: string;
  }
> = {
  // D1 (NUM.S, NUM.F, NUM.2-NUM.5). None of these carries a caption: each widget below
  // states its own task on its `.lesson-interactive__status` line (the two PEMDAS solvers
  // on `pemdas-solver__status`), and the caption only ever restated it. The packs used to
  // say the task a third time in the slide prose; that copy is gone too (R9).
  // See the `caption` note on the registry type.
  "pemdas-solver": { Svg: PemdasStepSolver },
  "pemdas-solver-ltr": { Svg: PemdasStepSolverLtr },
  "distribute-builder": { Svg: DistributeBuilder },
  "like-terms-sorter": { Svg: LikeTermsSorter },
  "percent-slider": { Svg: PercentSlider },
  "pemdas-key-explore": { Svg: PemdasKeyExplore },
  "pemdas-mnemonic-explore": { Svg: PemdasMnemonicExplore },
  "order-matters-play": { Svg: OrderMattersPlay },
  "commutative-associative-play": { Svg: CommutativeAssociativePlay },
  "identity-inverse-match": { Svg: IdentityInverseMatch },
  "like-terms-classify": { Svg: LikeTermsClassify },
  "distribute-combine-play": { Svg: DistributeCombinePlay },
  "unit-rate-play": { Svg: UnitRatePlay },
  "proportion-cross-play": { Svg: ProportionCrossPlay },
  "unit-conversion-spot": { Svg: UnitConversionSpot },
  "fraction-parts-explore": { Svg: FractionPartsExplore },
  "equivalent-fraction-play": { Svg: EquivalentFractionPlay },
  "common-denominator-multiples": { Svg: CommonDenominatorMultiples },
  "fraction-multiply-play": { Svg: FractionMultiplyPlay },
  "fraction-divide-play": { Svg: FractionDividePlay },
  "absolute-value-explore": { Svg: AbsoluteValueExplore },
  "signed-addition-walkthrough": { Svg: SignedAdditionWalkthrough },
  "subtract-as-add-play": { Svg: SubtractAsAddPlay },
  "sign-rules-table": { Svg: SignRulesTable },
  // D2 (EXP.1, RAD.1-4). None of these carries a caption: each of the twenty-one
  // widgets below already states its own task on its `.lesson-interactive__status` line,
  // one line above where the caption would render, and the caption only ever restated it.
  // See the `caption` note on the registry type.
  "power-parts-label": { Svg: PowerPartsLabel },
  "exponent-laws-builder": { Svg: ExponentLawsBuilder },
  "power-of-power-walkthrough": { Svg: PowerOfPowerWalkthrough },
  "power-of-power-match": { Svg: PowerOfPowerMatch },
  "zero-exponent-table": { Svg: ZeroExponentTable },
  "negative-exponent-estimate": { Svg: NegativeExponentEstimate },
  "negative-exponent-play": { Svg: NegativeExponentPlay },
  "negative-exponent-order": { Svg: NegativeExponentOrder },
  "positive-exponent-solver": { Svg: PositiveExponentSolver },
  "unlike-base-spot": { Svg: UnlikeBaseSpot },
  "radical-parts-label": { Svg: RadicalPartsLabel },
  "perfect-root-classify": { Svg: PerfectRootClassify },
  "perfect-square-factor-match": { Svg: PerfectSquareFactorMatch },
  "radical-factor-builder": { Svg: RadicalFactorBuilder },
  "simplify-radical-solver": { Svg: SimplifyRadicalSolver },
  "radical-quotient-sorter": { Svg: RadicalQuotientSorter },
  "like-radicals-sorter": { Svg: LikeRadicalsSorter },
  "unlike-sum-table": { Svg: UnlikeSumTable },
  "combine-radicals-builder": { Svg: CombineRadicalsBuilder },
  "rationalize-solver": { Svg: RationalizeSolver },
  "rationalize-explore": { Svg: RationalizeExplore },
  "rational-exponent-play": { Svg: RationalExponentPlay },
  "fraction-exponent-label": { Svg: FractionExponentLabel },
  "fraction-exponent-undo-table": { Svg: FractionExponentUndoTable },
  "radical-form-builder": { Svg: RadicalFormBuilder },
  "exponent-form-builder": { Svg: ExponentFormBuilder },
  "rational-power-solver": { Svg: RationalPowerSolver },
  "magnitude-root-play": { Svg: MagnitudeRootPlay },
  "sqrt-square-spot": { Svg: SqrtSquareSpot },
  "root-parity-builder": { Svg: RootParityBuilder },
  "variable-radicand-builder": { Svg: VariableRadicandBuilder },
  "mixed-radicand-solver": { Svg: MixedRadicandSolver },
  // D5 (RAT.1-RAT.6). None of these carries a caption either: every widget states its own
  // task on its `.lesson-interactive__status` line, and the captions restated it closely
  // enough that the validator read one of them as a duplicate of the slide's prose.
  // See the `caption` note on the registry type.
  "rational-forbidden-dose-explore": { Svg: RationalForbiddenDoseExplore },
  "rational-reduce-play": { Svg: RationalReducePlay },
  "rational-exclusion-classify": { Svg: RationalExclusionClassify },
  "rational-simplify-order": { Svg: RationalSimplifyOrder },
  "rational-scale-cancel-play": { Svg: RationalScaleCancelPlay },
  "rational-scale-dose-explore": { Svg: RationalScaleDoseExplore },
  "rational-reciprocal-walkthrough": { Svg: RationalReciprocalWalkthrough },
  "rational-divide-dose-sorter": { Svg: RationalDivideDoseSorter },
  "rational-numeric-twin-match": { Svg: RationalNumericTwinMatch },
  "rational-add-lcd-builder": { Svg: RationalAddLcdBuilder },
  "rational-add-walkthrough": { Svg: RationalAddWalkthrough },
  "rational-subtract-sign-play": { Svg: RationalSubtractSignPlay },
  "rational-clear-measure-walkthrough": { Svg: RationalClearMeasureWalkthrough },
  "rational-combined-rate-build": { Svg: RationalCombinedRateBuild },
  "rational-cursed-root-classify": { Svg: RationalCursedRootClassify },
  "rational-proving-run-solver": { Svg: RationalProvingRunSolver },
  "rational-nested-bar-play": { Svg: RationalNestedBarPlay },
  "rational-nested-flip-spot": { Svg: RationalNestedFlipSpot },
  "rational-clear-lcd-builder": { Svg: RationalClearLcdBuilder },
  "rational-nested-dose-sorter": { Svg: RationalNestedDoseSorter },
  "rational-gauge-domain-explore": { Svg: RationalGaugeDomainExplore },
  "rational-hole-asymptote-play": { Svg: RationalHoleAsymptotePlay },
  "rational-intercept-walkthrough": { Svg: RationalInterceptWalkthrough },
  "rational-end-behavior-table": { Svg: RationalEndBehaviorTable },
  // D7 (LF.1-LF.4). None of these carries a caption either, for the same reason: each
  // widget's own status line states its task, and a caption one line below it said the same
  // thing again. See the `caption` note on the registry type.
  "linear-slope-ratio-table": { Svg: LinearSlopeRatioTable },
  "linear-slope-triangle-play": { Svg: LinearSlopeTrianglePlay },
  "linear-slope-direction-classify": { Svg: LinearSlopeDirectionClassify },
  "linear-slope-walkthrough": { Svg: LinearSlopeWalkthrough },
  "linear-line-form-build": { Svg: LinearLineFormBuild },
  "linear-line-graph-play": { Svg: LinearLineGraphPlay },
  "linear-line-pair-classify": { Svg: LinearLinePairClassify },
  "linear-line-convert-order": { Svg: LinearLineConvertOrder },
  "linear-model-rate-explore": { Svg: LinearModelRateExplore },
  "linear-model-table-build": { Svg: LinearModelTableBuild },
  "linear-model-claim-spot": { Svg: LinearModelClaimSpot },
  "linear-model-walkthrough": { Svg: LinearModelWalkthrough },
  "linear-system-graph-explore": { Svg: LinearSystemGraphExplore },
  "linear-system-substitute-play": { Svg: LinearSystemSubstitutePlay },
  "linear-system-eliminate-build": { Svg: LinearSystemEliminateBuild },
  "linear-system-walkthrough": { Svg: LinearSystemWalkthrough },
  "exp-growth-table": { Svg: ExpGrowthTable },
  "exp-factor-slider": { Svg: ExpFactorSlider },
  "exp-decay-classify": { Svg: ExpDecayClassify },
  "exp-continuous-walkthrough": { Svg: ExpContinuousWalkthrough },
  "exp-graph-play": { Svg: ExpGraphPlay },
  "exp-shift-drag": { Svg: ExpShiftDrag },
  "exp-transform-builder": { Svg: ExpTransformBuilder },
  "exp-feature-label": { Svg: ExpFeatureLabel },
  "log-question-explore": { Svg: LogQuestionExplore },
  "log-form-match": { Svg: LogFormMatch },
  "log-evaluate-stepper": { Svg: LogEvaluateStepper },
  "log-natural-spot": { Svg: LogNaturalSpot },
  "log-mirror-explore": { Svg: LogMirrorExplore },
  "log-domain-classify": { Svg: LogDomainClassify },
  "log-shift-slider": { Svg: LogShiftSlider },
  "log-domain-builder": { Svg: LogDomainBuilder },
  "log-product-table": { Svg: LogProductTable },
  "log-expand-order": { Svg: LogExpandOrder },
  "log-condense-builder": { Svg: LogCondenseBuilder },
  "log-base-change-walkthrough": { Svg: LogBaseChangeWalkthrough },
  "equation-same-base-stepper": { Svg: EquationSameBaseStepper },
  "equation-take-log-walkthrough": { Svg: EquationTakeLogWalkthrough },
  "equation-gather-convert-match": { Svg: EquationGatherConvertMatch },
  "equation-extraneous-spot": { Svg: EquationExtraneousSpot },
  // D9 (TRG.1-TRG.9). No captions here either: all thirty-six state their own task on
  // their `.lesson-interactive__status` line. See the `caption` note on the registry type.
  "trg-bearing-table": { Svg: TrigBearingTable },
  "trg-radian-match": { Svg: TrigRadianMatch },
  "trg-coterminal-sorter": { Svg: TrigCoterminalSorter },
  "trg-convert-spot": { Svg: TrigConvertSpot },
  "trg-guywire-label": { Svg: TrigGuyWireLabel },
  "trg-ratio-table": { Svg: TrigRatioTable },
  "trg-special-match": { Svg: TrigSpecialMatch },
  "trg-cofunction-spot": { Svg: TrigCofunctionSpot },
  "trg-unitcircle-explore": { Svg: TrigUnitCircleExplore },
  "trg-quadrant-sorter": { Svg: TrigQuadrantSorter },
  "trg-reference-table": { Svg: TrigReferenceTable },
  "trg-reference-order": { Svg: TrigReferenceOrder },
  "trg-six-table": { Svg: TrigSixTable },
  "trg-reciprocal-match": { Svg: TrigReciprocalMatch },
  "trg-evenodd-sorter": { Svg: TrigEvenOddSorter },
  "trg-identity-spot": { Svg: TrigIdentitySpot },
  "trg-amplitude-slider": { Svg: TrigAmplitudeSlider },
  "trg-period-table": { Svg: TrigPeriodTable },
  "trg-phase-drag": { Svg: TrigPhaseDrag },
  "trg-feature-label": { Svg: TrigFeatureLabel },
  "trg-tangent-explore": { Svg: TrigTangentExplore },
  "trg-asymptote-table": { Svg: TrigAsymptoteTable },
  "trg-secant-sorter": { Svg: TrigSecantSorter },
  "trg-cycle-match": { Svg: TrigCycleMatch },
  "trg-inverse-order": { Svg: TrigInverseOrder },
  "trg-range-label": { Svg: TrigRangeLabel },
  "trg-compose-sorter": { Svg: TrigComposeSorter },
  "trg-inverse-estimate": { Svg: TrigInverseEstimate },
  "trg-sweep-play": { Svg: TrigSweepPlay },
  "trg-solve-order": { Svg: TrigSolveOrder },
  "trg-roster-spot": { Svg: TrigRosterSpot },
  "trg-window-sorter": { Svg: TrigWindowSorter },
  "trg-combine-estimate": { Svg: TrigCombineEstimate },
  "trg-sum-table": { Svg: TrigSumTable },
  "trg-double-match": { Svg: TrigDoubleMatch },
  "trg-shorten-order": { Svg: TrigShortenOrder },
  "geo-cord-table": { Svg: GeoCordTable },
  "geo-diagonal-stepper": { Svg: GeoDiagonalStepper },
  "geo-angle-explore": { Svg: GeoAngleExplore },
  "geo-shadow-slider": { Svg: GeoShadowSlider },
  "geo-paving-classify": { Svg: GeoPavingClassify },
  "geo-compose-builder": { Svg: GeoComposeBuilder },
  "geo-cistern-play": { Svg: GeoCisternPlay },
  "geo-net-drag": { Svg: GeoNetDrag },
  "balance-beam-slider": { Svg: BalanceBeamSlider },
  "solve-steps-order": { Svg: SolveStepsOrder },
  "both-pans-builder": { Svg: BothPansBuilder },
  "solve-slip-spot": { Svg: SolveSlipSpot },
  "formula-target-match": { Svg: FormulaTargetMatch },
  "formula-subject-table": { Svg: FormulaSubjectTable },
  "formula-isolate-builder": { Svg: FormulaIsolateBuilder },
  "formula-check-play": { Svg: FormulaCheckPlay },
  "inequality-endpoint-drag": { Svg: InequalityEndpointDrag },
  "negative-flip-play": { Svg: NegativeFlipPlay },
  "interval-parts-label": { Svg: IntervalPartsLabel },
  "compound-band-sorter": { Svg: CompoundBandSorter },
  "interval-write-builder": { Svg: IntervalWriteBuilder },
  "off-standard-stepper": { Svg: OffStandardStepper },
  "abs-branch-builder": { Svg: AbsBranchBuilder },
  "abs-branch-spot": { Svg: AbsBranchSpot },
  "abs-count-classify": { Svg: AbsCountClassify },
  "tolerance-pass-sorter": { Svg: TolerancePassSorter },
  "abs-band-table": { Svg: AbsBandTable },
  "abs-union-builder": { Svg: AbsUnionBuilder },
  "abs-inequality-order": { Svg: AbsInequalityOrder },
  "polynomial-parts-label": { Svg: PolynomialPartsLabel },
  "stone-pieces-sorter": { Svg: StoneOrderSorter },
  "subtract-sign-spot": { Svg: SubtractSignSpot },
  "area-model-table": { Svg: AreaModelTable },
  "standard-form-builder": { Svg: StandardFormBuilder },
  "factor-pairs-match": { Svg: FactorPairsMatch },
  "common-measure-classify": { Svg: CommonMeasureClassify },
  "factor-pair-stepper": { Svg: FactorPairStepper },
  "difference-squares-drag": { Svg: DifferenceSquaresDrag },
  "perfect-square-sorter": { Svg: PerfectSquareSorter },
  "grouping-order": { Svg: GroupingOrder },
  "square-side-solver": { Svg: SquareSideSolver },
  "zero-product-play": { Svg: ZeroProductPlay },
  "solve-quadratic-order": { Svg: SolveQuadraticOrder },
  "lost-root-spot": { Svg: LostRootSpot },
  "complete-square-drag": { Svg: CompleteSquareDrag },
  "complete-square-table": { Svg: CompleteSquareTable },
  "complete-square-solver": { Svg: CompleteSquareSolver },
  "formula-parts-label": { Svg: FormulaPartsLabel },
  "discriminant-sorter": { Svg: DiscriminantSorter },
  "divide-rebuild-builder": { Svg: DivideRebuildBuilder },
  "long-division-stepper": { Svg: LongDivisionStepper },
  "division-check-table": { Svg: DivisionCheckTable },
  "synthetic-long-match": { Svg: SyntheticLongMatch },
  "leading-term-dominance-table": { Svg: LeadingTermDominanceTable },
  "leading-term-match": { Svg: LeadingTermMatch },
  "end-behavior-parity-sorter": { Svg: EndBehaviorParitySorter },
  "end-behavior-describe-order": { Svg: EndBehaviorDescribeOrder },
  "zeros-from-factors-table": { Svg: ZerosFromFactorsTable },
  "multiplicity-cross-sorter": { Svg: MultiplicityCrossSorter },
  "turning-points-estimate": { Svg: TurningPointsEstimate },
  "build-from-graph-order": { Svg: BuildFromGraphOrder },
  "parabola-opening-sorter": { Svg: ParabolaOpeningSorter },
  "vertex-form-read-table": { Svg: VertexFormReadTable },
  "extreme-value-order": { Svg: ExtremeValueOrder },
  "intercept-route-match": { Svg: InterceptRouteMatch },
  "remainder-estimate": { Svg: RemainderEstimate },
  // D6 (CG.1, FUN.1-FUN.10). None of these carries a caption either, for the same reason as
  // every domain above: each widget states its own task on its `.lesson-interactive__status`
  // line. See the `caption` note on the registry type.
  "coordinate-plot-stepper": { Svg: CoordinateGridPlot },
  "coordinate-quadrant-classify": { Svg: CoordinateQuadrantClassify },
  "coordinate-intercept-builder": { Svg: CoordinateInterceptRead },
  "coordinate-distance-walkthrough": { Svg: CoordinateDistanceMidpoint },
  "function-machine-solver": { Svg: FunctionMachineEvaluate },
  "function-notation-label": { Svg: FunctionNotationLabel },
  "function-vertical-line-slider": { Svg: FunctionVerticalLineTest },
  "function-mapping-classify": { Svg: FunctionMappingClassify },
  "domain-intake-explore": { Svg: DomainIntakeExplore },
  "domain-range-slider": { Svg: RangeOutputRead },
  "domain-restriction-classify": { Svg: DomainRestrictionClassify },
  "domain-interval-build": { Svg: DomainIntervalBuild },
  "piecewise-piece-classify": { Svg: PiecewisePieceSelect },
  "piecewise-evaluate-solver": { Svg: PiecewiseEvaluate },
  "piecewise-boundary-play": { Svg: PiecewiseBoundaryPlay },
  "piecewise-graph-build": { Svg: PiecewiseGraphBuild },
  "feature-interval-classify": { Svg: GraphIntervalClassify },
  "feature-extremum-spot": { Svg: GraphExtremumSpot },
  "feature-trace-walkthrough": { Svg: GraphFeatureWalkthrough },
  "feature-table": { Svg: GraphFeatureTable },
  "rate-average-explore": { Svg: AverageRateExplore },
  "rate-walkthrough": { Svg: AverageRateWalkthrough },
  "rate-table": { Svg: AverageRateTable },
  "rate-interval-slider": { Svg: AverageRateIntervalSlider },
  "quotient-build": { Svg: DifferenceQuotientBuild },
  "quotient-expand-walkthrough": { Svg: DifferenceQuotientWalkthrough },
  "quotient-cancel-play": { Svg: DifferenceQuotientCancelPlay },
  "quotient-order": { Svg: DifferenceQuotientOrder },
  "compose-series-explore": { Svg: ComposeSeriesExplore },
  "compose-evaluate-solver": { Svg: ComposeEvaluate },
  "compose-order-spot": { Svg: ComposeOrderSpot },
  "compose-build": { Svg: ComposeBuild },
  "inverse-reverse-play": { Svg: InverseReversePlay },
  "inverse-build": { Svg: InverseBuild },
  "inverse-one-to-one-classify": { Svg: InverseOneToOneClassify },
  "inverse-reflect-explore": { Svg: InverseReflectExplore },
  "transform-shift-slider": { Svg: TransformShiftSlider },
  "transform-stretch-explore": { Svg: TransformStretchExplore },
  "transform-parity-classify": { Svg: TransformParityClassify },
  "transform-order": { Svg: TransformOrder },
  "absvalue-vee-build": { Svg: AbsValueVeeBuild },
  "absvalue-vertex-slider": { Svg: AbsValueVertexSlider },
  "absvalue-evaluate-stepper": { Svg: AbsValueEvaluate },
  "absvalue-walkthrough": { Svg: AbsValueWalkthrough },
};

export function LessonVisual({
  id,
  onComplete,
  onReopen,
  onPlayingChange,
}: {
  id: LessonVisualId;
} & LessonWidgetProps) {
  const entry = REGISTRY[id];
  const { Svg, caption } = entry;
  /**
   * Whether this slide's gate is open right now.
   *
   * The reveal layer needs it and cannot ask the widget for it: a widget calls `onComplete`
   * and `onReopen` and is never told what they did, so the only thing that can answer is
   * whatever is holding the gate. Here that is these two callbacks, so this watches them go
   * past. `WidgetFeedbackHost` spends it on one thing: a reveal taken on a board the learner
   * has already finished hands the board back rather than only replacing it, because a redraw
   * would call `onReopen` and charge them their own "Next" for having read an explanation.
   *
   * An UNGATED mount (the dev slide viewer, the combined review page) is passed no
   * `onComplete` and stays `false` throughout: there is no gate there, so nothing has been
   * earned and the reveal keeps its stricter shape.
   */
  const [gateOpen, setGateOpen] = useState(false);
  const gated = onComplete !== undefined;
  return (
    <figure className="lesson-visual">
      <WidgetFeedbackHost gateOpen={gateOpen}>
        <Svg
          onComplete={
            gated
              ? () => {
                  setGateOpen(true);
                  onComplete();
                }
              : undefined
          }
          // Wrapped whenever there IS a gate, even where the caller supplied no `onReopen` of
          // its own: the flag has to come back down on a redraw, and a caller that only wants
          // the open half must not leave it stuck open.
          onReopen={
            gated
              ? () => {
                  setGateOpen(false);
                  onReopen?.();
                }
              : onReopen
          }
          onPlayingChange={onPlayingChange}
        />
      </WidgetFeedbackHost>
      {caption && (
        <figcaption>
          <LessonProse markdown={caption} />
        </figcaption>
      )}
    </figure>
  );
}
