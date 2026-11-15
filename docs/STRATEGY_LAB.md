# LeviOS Outreach · Strategy Lab playbook

This is a manual, truth-based testing system, not a bulk-email sender. All prospect records, strategy assignments, and human classification events are encrypted inside the owner's vault. The public source repository does not contain private records.

## Outcome definitions

- **Contacted**: one unique prospect with a manually confirmed send event. Multiple emails to that prospect do **not** enlarge the denominator.
- **Human reply rate** = unique contacted prospects with a reviewed human reply / unique contacted prospects.
- **Positive reply rate** = unique contacted prospects whose reviewed human reply is marked **positive** / unique contacted prospects.
- **Positive share of human replies** = positive human replies / human replies. Do not confuse this with positive reply rate.
- **Meeting / win indicator** = prospects manually moved to **Meeting Booked** or **Won**. It is not inferred from an email.
- **Automated replies** (such as out-of-office) are excluded from human reply counts. Negative responses are included in human reply rate, but not positive reply rate.
- **Opens and clicks** are not counted in the scorecard. Mail privacy and filtering can distort these, and a click need not imply buyer interest.

## Running an experiment

1. Choose an industry and offer (for example, independent bakeries and an audit for missed inbound inquiries). Keep the offer, audience quality and targeting criteria stable.
2. Select an experiment in **Strategy Lab** or create a custom one. Each experiment has one explicit hypothesis and two variants.
3. Assign each new verified prospect to **A** or **B** on the opportunity form. Alternate or randomize assignments within the same industry so the variants are comparable.
4. Draft the real message in the selected style. Include accurate sender identity, truthful claims, and appropriate opt-out/contact information. If using CC, include only genuinely relevant verified stakeholders. All CC recipients can see one another.
5. Save an email **draft** through Gmail or open a compose window. This does **not** count as a send. Send manually only after reviewing.
6. In LeviOS, click **Yes, I sent it** only after sending the email. LeviOS snapshots the strategy ID, variant, industry, word count, subject and CC count at that time.
7. In **Insights**, use **Scan Gmail for replies**. The read-only checker matches incoming and outgoing Gmail thread IDs and requires inbound time after an actual sent message. Independently originated messages, self-addressed tests and most auto-responders are not counted. Classification still requires the user's review.
8. Record **positive**, **neutral**, **negative**, **opt-out**, or **automatic**. Positive/negative/neutral count as human replies; opt-out also prevents further outreach to the record; automatic does not count.
9. Compare per-contact response rates by industry *and* variant inside Strategy Lab. A handful of prospects is directional learning only, not a statistical winner. Rare positive outcomes may require hundreds per arm for a persuasive difference.

## Starting hypotheses

- **Angle**: a verifiable problem revelation versus an upside opportunity. Do not fabricate revenue losses or claim to have performed a detailed audit you did not do.
- **CTA**: permission to share a useful example versus a direct short meeting request.
- **Length**: 60–90 words versus 130–170 words (track actual sent word count).
- **Subject**: truthful direct context versus a concise curiosity question.
- **Personalization**: a real observation about a business versus a relevant industry observation.
- **CC**: one primary contact versus involving a genuinely relevant teammate; *not* an intimidation-style executive escalation.
- **Signature**: a brief genuine sender signature versus a more descriptive genuine professional signature. Never pretend to be a woman or any other person who is not actually sending the email.
- **Follow-up**: a new useful detail versus a courteous reminder. Do not follow up after an opt-out.

## Guardrails

- No auto-send, no invisible tracking pixel, no campaign click-shorteners, no changing sender identity under false pretenses.
- U.S. CAN-SPAM applies to commercial B2B email as well: maintain accurate headers, accurate subject, valid contact address, workable opt-out and prompt suppression. Check requirements in every target jurisdiction.
- No trustworthy analytics are possible without accurate send confirmation. Prospects who merely have drafts are **not** in the denominator.
- Gmail reply review only inspects a limited slice of eligible contacted prospects (12 per manual scan). Missing or unmatched results mean **unknown**, not necessarily **no reply**.
- Use the original encrypted passphrase and encrypted backups when moving devices; cloud snapshots have conflict protection, not automatic merging.

## Sources and reference guidance

- FTC CAN-SPAM compliance: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Google Gmail messages listing: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
- Google Gmail thread grouping: https://developers.google.com/workspace/gmail/api/guides/threads
- Mailchimp Apple Mail Privacy Protection caveat: https://mailchimp.com/help/apple-privacy-faq/


## Prospect research and loading

Research packs are plain JSON files with `records` and optional `strategies`. They can be prepared externally, with all source URLs kept. Import only after the owner reviews the research. In LeviOS, open **People & Companies → Import JSON / CSV**, select the JSON, and approve the counts. Duplicate records and strategy IDs are skipped; imports cannot send emails.

Business website listings or chamber directories are useful discovery inputs. For contact verification, inspect the official business website and label only addresses explicitly published by the business. Store `sourceUrl`, `researchDate`, `verification`, and `notes` to make assertions auditable. Contact emails may change; recheck them before sending. Do not turn uncertain marketing hypotheses into fake revenue-loss claims.

For Fox Valley bakery prospects, a practical first cohort is small local shops with an observable order/booking or seasonal offer. Compare problem-reveal versus benefit-led copy without changing the target audience, sender identity, offer, or CTA. Do not confuse targeted local business research with scraping Google Maps listings; see Google's Places API storage and scraping policy: https://developers.google.com/maps/documentation/places/web-service/policies
