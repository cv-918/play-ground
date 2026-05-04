#include "framework.h"
#include "DialogueSampleFactory.h"

DialogueSessionData DialogueSampleFactory::MakeBasicSession()
{
	DialogueSessionData session;
	session.session_id = L"S01_Basic";
	session.settings.allow_auto_advance = false;
	session.settings.allow_skip_in_choice = false;
	session.settings.block_game_input = true;
	session.settings.use_typing_effect_by_default = true;
	session.settings.default_auto_advance_delay = 0.f;

	DialogueLine line0;
	line0.message_type = DialogueMessageType::Dialogue;
	line0.speaker_name = L"안내원";
	line0.text = L"여긴 처음이지?";
	line0.use_typing_effect = true;
	line0.next_index = 1;

	DialogueLine line1;
	line1.message_type = DialogueMessageType::Dialogue;
	line1.speaker_name = L"주인공";
	line1.text = L"그래. 방금 도착했어.";
	line1.use_typing_effect = true;
	line1.next_index = 2;

	DialogueLine line2;
	line2.message_type = DialogueMessageType::Narration;
	line2.text = L"낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다. 낡은 마을 입구에는 조용한 바람만 불고 있었다.";
	line2.use_typing_effect = true;
	line2.next_index = -1;

	session.lines.push_back(line0);
	session.lines.push_back(line1);
	session.lines.push_back(line2);

	return session;
}

DialogueSessionData DialogueSampleFactory::MakeChoiceSession()
{
	DialogueSessionData session;
	session.session_id = L"S02_Choice";
	session.settings.allow_auto_advance = false;
	session.settings.allow_skip_in_choice = false;
	session.settings.block_game_input = true;
	session.settings.use_typing_effect_by_default = true;
	session.settings.default_auto_advance_delay = 0.f;

	DialogueLine line0;
	line0.message_type = DialogueMessageType::Dialogue;
	line0.speaker_name = L"안내원";
	line0.text = L"어느 길로 갈 거지?";
	line0.use_typing_effect = true;
	line0.choices =
	{
		{ L"왼쪽 길로 간다.", 1 },
		{ L"오른쪽 길로 간다.", 2 }
	};

	DialogueLine line1;
	line1.message_type = DialogueMessageType::Narration;
	line1.text = L"왼쪽 길은 어둡고 축축했다.";
	line1.use_typing_effect = true;
	line1.next_index = -1;

	DialogueLine line2;
	line2.message_type = DialogueMessageType::Narration;
	line2.text = L"오른쪽 길은 밝고 넓었다.";
	line2.use_typing_effect = true;
	line2.next_index = -1;

	session.lines.push_back(line0);
	session.lines.push_back(line1);
	session.lines.push_back(line2);

	return session;
}

DialogueSessionData DialogueSampleFactory::MakeEventSession()
{
	DialogueSessionData session;
	session.session_id = L"S03_Event";
	session.settings.allow_auto_advance = false;
	session.settings.allow_skip_in_choice = true;
	session.settings.block_game_input = true;
	session.settings.use_typing_effect_by_default = true;
	session.settings.default_auto_advance_delay = 0.f;

	DialogueLine line0;
	line0.message_type = DialogueMessageType::Dialogue;
	line0.speaker_name = L"문지기";
	line0.text = L"문을 열겠다.";
	line0.use_typing_effect = true;
	line0.next_index = 1;
	line0.events =
	{
		{ DialogueEventCategory::Gameplay, DialogueEventTrigger::OnLineEnter, L"OpenGate" },
		{ DialogueEventCategory::SessionDirection, DialogueEventTrigger::OnLineExit, L"PlayGateFx" }
	};

	DialogueLine line1;
	line1.message_type = DialogueMessageType::SystemMessage;
	line1.text = L"문이 열렸습니다.";
	line1.use_typing_effect = true;
	line1.next_index = -1;

	session.lines.push_back(line0);
	session.lines.push_back(line1);

	return session;
}

DialogueSessionData DialogueSampleFactory::MakeHoldSkipGameplayEventSession()
{
	DialogueSessionData session;
	session.session_id = L"S04_HoldSkipGameplayEvent";
	session.settings.allow_auto_advance = false;
	session.settings.allow_skip_in_choice = true;
	session.settings.block_game_input = true;
	session.settings.use_typing_effect_by_default = true;
	session.settings.default_auto_advance_delay = 0.f;

	DialogueLine line0;
	line0.message_type = DialogueMessageType::Dialogue;
	line0.speaker_name = L"Tester";
	line0.text = L"Hold SPACE or LBUTTON here for two seconds. Skipping should still run later gameplay events.";
	line0.use_typing_effect = true;
	line0.next_index = 1;

	DialogueLine line1;
	line1.message_type = DialogueMessageType::Dialogue;
	line1.speaker_name = L"Tester";
	line1.text = L"This line has a gameplay event on enter. It should fire during hold skip.";
	line1.use_typing_effect = true;
	line1.next_index = 2;
	line1.events =
	{
		{ DialogueEventCategory::Gameplay, DialogueEventTrigger::OnLineEnter, L"ActiveRing" }
	};

	DialogueLine line2;
	line2.message_type = DialogueMessageType::SystemMessage;
	line2.text = L"This line only has a direction event. It should not fire during session skip.";
	line2.use_typing_effect = true;
	line2.next_index = -1;
	line2.events =
	{
		{ DialogueEventCategory::SessionDirection, DialogueEventTrigger::OnLineEnter, L"HoldSkipDirectionOnly" }
	};

	session.lines.push_back(line0);
	session.lines.push_back(line1);
	session.lines.push_back(line2);

	return session;
}
