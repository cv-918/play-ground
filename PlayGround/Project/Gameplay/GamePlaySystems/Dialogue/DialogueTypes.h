#pragma once

#include <string>
#include <vector>

/**
 * @brief 다이얼로그 시스템에서 사용하는 공용 enum/구조체 집합.
 *
 * 런타임 상태, 세션 데이터, 라인 데이터, 결과 데이터 등
 * 시스템 전반에서 공유되는 타입을 정의한다.
 *
 * 주의:
 * - 런타임 문자열은 std::wstring 기반으로 처리한다.
 * - 외부 JSON 로딩 단계에서 std::string을 사용하더라도,
 *   다이얼로그 시스템에 주입되기 전에는 std::wstring으로 변환되어야 한다.
 */

enum class DialogueMessageType
{
    None,
    Dialogue,
    Narration,
    SystemMessage
};

enum class DialogueEventCategory
{
    None,
    Gameplay,
    SessionDirection
};

enum class DialogueEventTrigger
{
    None,
    OnLineEnter,
    OnLineExit
};

enum class DialogueSessionState
{
    Idle,
    Opening,
    Running,
    Closing,
    Finished
};

enum class DialogueLineState
{
    None,
    Typing,
    WaitingForNext,
    WaitingForChoice,
    AutoAdvancing,
    SkippingSession,
    Completed
};

enum class DialogueSessionEndReason
{
    Completed,
    Skipped,
    Aborted,
    InvalidData
};

struct DialogueChoice
{
    std::wstring text;
    int next_index = -1;
};

struct DialogueEvent
{
    DialogueEventCategory category = DialogueEventCategory::SessionDirection;
    DialogueEventTrigger trigger = DialogueEventTrigger::OnLineEnter;
    std::wstring event_id;
};

struct DialogueLine
{
    DialogueMessageType message_type = DialogueMessageType::Dialogue;

    std::wstring speaker_name;
    std::wstring text;

    bool use_typing_effect = true;
    bool use_auto_advance = false;
    float auto_advance_delay = 0.f;

    std::vector<DialogueEvent> events;
    std::vector<DialogueChoice> choices;

    int next_index = -1;
};

struct DialogueSessionSettings
{
    bool allow_auto_advance = false;
    bool allow_skip_in_choice = false;
    bool block_game_input = true;
    bool use_typing_effect_by_default = true;
    float default_auto_advance_delay = 0.f;
};

struct DialogueSessionData
{
    std::wstring session_id;
    DialogueSessionSettings settings;
    std::vector<DialogueLine> lines;
};

struct DialogueChoiceRecord
{
    int line_index = -1;
    int choice_index = -1;
    std::wstring choice_text;
    int next_index = -1;
};

struct DialogueExecutionRecord
{
    std::vector<int> visited_line_indices;
    std::vector<std::wstring> executed_gameplay_event_ids;
};

struct DialogueSessionResult
{
    DialogueSessionEndReason end_reason = DialogueSessionEndReason::Completed;
    std::vector<DialogueChoiceRecord> choice_records;
    DialogueExecutionRecord execution_record;
};

struct DialogueRuntimeState
{
    DialogueSessionState session_state = DialogueSessionState::Idle;
    DialogueLineState line_state = DialogueLineState::None;

    int current_line_index = -1;
    int selected_choice_index = 0;

    int current_page_index = 0;
    int total_page_count = 1;

    int page_char_start = 0;
    int page_char_end = 0;

    int visible_char_count = 0;
    float typing_elapsed = 0.f;
    float auto_advance_elapsed = 0.f;

    bool auto_advance_canceled_by_input = false;
    bool skip_requested = false;
};
