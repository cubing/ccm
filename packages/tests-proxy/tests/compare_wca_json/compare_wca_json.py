#!/usr/bin/env python3

import json
import unittest

SKIP_SCRAMBLES = True # urg

class CcmTest(unittest.TestCase):
    def test_ccm_matches_wa(self):
        self.maxDiff = None
        with open("AtomicCubing2016-CCM.json", "r") as ccm_json_file, open("Results for AtomicCubing2016.json", "r") as wa_json_file:
            ccm_json = json.load(ccm_json_file)
            wa_json = json.load(wa_json_file)

            # Test that the WCA Competition JSON formats are effectively the same:
            # https://github.com/cubing/worldcubeassociation.org/wiki/WCA-Competition-JSON-Format

            self.assertEqual(ccm_json["formatVersion"], wa_json["formatVersion"])
            self.assertEqual(ccm_json["resultsProgram"], "CCM")
            self.assertEqual(wa_json["resultsProgram"], "WCA Workbook Assistant v2.3")
            self.assertEqual(ccm_json["competitionId"], wa_json["competitionId"])
            if not SKIP_SCRAMBLES:
                self.assertEqual(ccm_json["scrambleProgram"], wa_json["scrambleProgram"])

            # Check persons
            ccm_persons = ccm_json["persons"]
            ccm_personId_to_canonicalId = {}
            wa_persons = wa_json["persons"]
            wa_personId_to_canonicalId = {}
            canonicalId = 1
            for wa_person in wa_json["persons"]:
                for ccm_person in ccm_json["persons"]:
                    if ccm_person['name'] == wa_person['name']:
                        ccm_personId_to_canonicalId[ccm_person['id']] = canonicalId
                        wa_personId_to_canonicalId[wa_person['id']] = canonicalId
                        canonicalId += 1
                        break
            ccm_persons.sort(key=lambda p: ccm_personId_to_canonicalId[p['id']])
            wa_persons.sort(key=lambda p: wa_personId_to_canonicalId[p['id']])
            for p in ccm_persons:
                del p['id']
                if p.get('wcaId') == "":
                  del p['wcaId']
            for p in wa_persons:
                del p['id']
                if p.get('wcaId') == "":
                  del p['wcaId']
            self.assertEqual(ccm_persons, wa_persons)

            # Check events
            ccm_events = ccm_json["events"]
            wa_events = wa_json["events"]
            self.assertEqual(len(ccm_events), len(wa_events))
            ccm_event_by_id = { event['eventId']: event for event in ccm_events }
            wa_event_by_id = { event['eventId']: event for event in wa_events }
            self.assertCountEqual(ccm_event_by_id.keys(), wa_event_by_id.keys())
            for eventId in ccm_event_by_id:
                print("Comparing {}".format(eventId))

                ccm_event = ccm_event_by_id[eventId]
                wa_event = wa_event_by_id[eventId]

                ccm_rounds = ccm_event["rounds"]
                wa_rounds = wa_event["rounds"]
                self.assertEqual(len(ccm_rounds), len(wa_rounds))
                ccm_round_by_id = { r['roundId']: r for r in ccm_rounds }
                wa_round_by_id = { r['roundId']: r for r in wa_rounds }
                self.assertCountEqual(ccm_round_by_id.keys(), wa_round_by_id.keys())

                for roundId in ccm_round_by_id:
                    ccm_round = ccm_round_by_id[roundId]
                    wa_round = wa_round_by_id[roundId]

                    for ccm_result in ccm_round['results']:
                        ccm_result['personId'] = ccm_personId_to_canonicalId[ccm_result['personId']]
                    for wa_result in wa_round['results']:
                        wa_result['personId'] = wa_personId_to_canonicalId[wa_result['personId']]
                    if SKIP_SCRAMBLES:
                        del ccm_round['groups']
                        del wa_round['groups']
                    self.assertEqual(ccm_round, wa_round)

if __name__ == '__main__':
    unittest.main()
