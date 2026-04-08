import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #C5A55A",
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 3,
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  scoreCard: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  column: {
    flex: 1,
  },
  card: {
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  cardItem: {
    fontSize: 9,
    marginBottom: 3,
    color: "#444",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 4,
  },
  stepCard: {
    marginBottom: 12,
    border: "1 solid #e0e0e0",
    borderRadius: 4,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "bold",
    flex: 1,
  },
  stepScore: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#C5A55A",
  },
  stepContent: {
    padding: 10,
  },
  criteriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "1 solid #eee",
  },
  criteriaText: {
    flex: 1,
    fontSize: 9,
    color: "#444",
  },
  criteriaScore: {
    fontSize: 9,
    fontWeight: "bold",
    marginLeft: 10,
  },
  debriefSection: {
    marginTop: 8,
  },
  debriefLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 3,
  },
  debriefBadge: {
    fontSize: 8,
    backgroundColor: "#C5A55A",
    color: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 3,
  },
  notesSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fff8e1",
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
  notEvaluated: {
    color: "#999",
    fontStyle: "italic",
    fontSize: 9,
  },
  strengthItem: {
    color: "#16a34a",
  },
  weaknessItem: {
    color: "#d97706",
  },
});

const renderStarsText = (score: number) => {
  const filled = Math.round(score);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
};

interface SessionPdfProps {
  session: any;
  scores: any[];
  steps: any[];
  strengths: any[];
  weaknesses: any[];
}

const getStepAverage = (criteriaScores: number[] | undefined) => {
  if (!criteriaScores || criteriaScores.length === 0) return null;
  const valid = criteriaScores.filter((v) => v > 0);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const SessionPdfDocument = ({ session, scores, steps, strengths, weaknesses }: SessionPdfProps) => {
  const getScoreForStep = (stepId: string) =>
    scores?.find((s) => s.step_id === stepId);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Session #{session.session_number} — {session.coach_type?.label}
          </Text>
          <Text style={styles.subtitle}>
            Date : {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
          </Text>
          <Text style={styles.subtitle}>
            Eleve : {session.student?.full_name || session.student?.email}
          </Text>
          <Text style={styles.subtitle}>
            Coach : {session.coach?.full_name || session.coach?.email}
          </Text>
          {session.sub_mode && (
            <Text style={styles.subtitle}>Mode : {session.sub_mode}</Text>
          )}
        </View>

        {/* Score global */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Score global</Text>
            <Text style={styles.scoreValue}>
              {session.global_score?.toFixed(1) || "—"}/5
            </Text>
            {session.global_score && (
              <Text style={{ marginTop: 5, color: "#f59e0b" }}>
                {renderStarsText(session.global_score)}
              </Text>
            )}
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Etapes evaluees</Text>
            <Text style={styles.scoreValue}>
              {steps.filter((s: any) => getScoreForStep(s.id)).length}/{steps.length}
            </Text>
          </View>
        </View>

        {/* Forces et faiblesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <View style={styles.row}>
            <View style={styles.column}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Points forts</Text>
                {strengths.length > 0 ? (
                  strengths.map((s: any, i: number) => (
                    <Text key={i} style={[styles.cardItem, styles.strengthItem]}>
                      {"\u2022"} {s.title} — {s.score?.toFixed(1)}/5
                    </Text>
                  ))
                ) : (
                  <Text style={styles.cardItem}>Aucun score {"\u2265"} 4</Text>
                )}
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>A ameliorer</Text>
                {weaknesses.length > 0 ? (
                  weaknesses.map((s: any, i: number) => (
                    <Text key={i} style={[styles.cardItem, styles.weaknessItem]}>
                      {"\u2022"} {s.title} — {s.score?.toFixed(1)}/5
                    </Text>
                  ))
                ) : (
                  <Text style={styles.cardItem}>Tous les scores {"\u2265"} 4 !</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Détail par étape */}
        <View>
          <Text style={styles.sectionTitle}>Detail par etape</Text>

          {steps.map((step: any) => {
            const stepScore = getScoreForStep(step.id);
            const isEvaluated = !!stepScore;
            const criteriaScores = (stepScore?.criteria_scores as number[]) || [];
            const debriefResponses = (stepScore?.debrief_responses as string[]) || [];
            const notes = stepScore?.notes;
            const avg = getStepAverage(criteriaScores);
            const criteria = step.criteria || [];

            return (
              <View key={step.id} style={styles.stepCard} wrap={false}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>
                    {step.label} — {step.title}
                  </Text>
                  {isEvaluated && avg !== null ? (
                    <Text style={styles.stepScore}>
                      {renderStarsText(avg)} {avg.toFixed(1)}/5
                    </Text>
                  ) : (
                    <Text style={styles.notEvaluated}>Non evalue</Text>
                  )}
                </View>

                <View style={styles.stepContent}>
                  {/* Critères — positional array */}
                  {criteriaScores.length > 0 &&
                    criteriaScores.map((val: number, i: number) => (
                      <View key={i} style={styles.criteriaRow}>
                        <Text style={styles.criteriaText}>
                          {criteria[i]?.criteria_text || `Critere ${i + 1}`}
                        </Text>
                        <Text style={styles.criteriaScore}>
                          {val > 0 ? `${val}/5` : "—"}
                        </Text>
                      </View>
                    ))}

                  {/* Débriefs */}
                  {debriefResponses.length > 0 && (
                    <View style={styles.debriefSection}>
                      {step.debriefs && step.debriefs.length > 0 ? (
                        step.debriefs.map((debrief: any) => {
                          const matched = debriefResponses.filter((opt: string) =>
                            debrief.options?.includes(opt)
                          );
                          if (matched.length === 0) return null;
                          return (
                            <View key={debrief.id} style={{ marginBottom: 5 }}>
                              <Text style={styles.debriefLabel}>{debrief.debrief_label}</Text>
                              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                                {matched.map((opt: string, j: number) => (
                                  <Text key={j} style={styles.debriefBadge}>{opt}</Text>
                                ))}
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                          {debriefResponses.map((opt: string, j: number) => (
                            <Text key={j} style={styles.debriefBadge}>{opt}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Notes */}
                  {notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Notes du coach</Text>
                      <Text style={styles.notesText}>{notes}</Text>
                    </View>
                  )}

                  {!isEvaluated && (
                    <Text style={styles.notEvaluated}>Cette etape n'a pas ete evaluee</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Genere le {format(new Date(), "d MMMM yyyy", { locale: fr })} — AL BARAKA Coaching
        </Text>
      </Page>
    </Document>
  );
};

export const downloadSessionPdf = async (
  session: any,
  scores: any[],
  steps: any[],
  strengths: any[],
  weaknesses: any[]
) => {
  const blob = await pdf(
    <SessionPdfExport
      session={session}
      scores={scores}
      steps={steps}
      strengths={strengths}
      weaknesses={weaknesses}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `session-${session.session_number}-${session.coach_type?.label?.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(session.session_date), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const SessionPdfExport = SessionPdfDocument;
export default SessionPdfExport;
