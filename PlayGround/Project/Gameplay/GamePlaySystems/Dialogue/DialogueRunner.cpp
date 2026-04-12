#include "framework.h"
#include "DialogueRunner.h"
#include "IDialogueEventListener.h"

#include <cassert>
#include <utility>

namespace
{
    constexpr float k_default_typing_interval = 0.03f;

    constexpr _float k_dialogue_window_width_ratio = 0.74f;
    constexpr _float k_dialogue_window_height_ratio = 0.16f;
    constexpr _float k_dialogue_window_bottom_margin_ratio = 0.05f;

    constexpr _float k_dialogue_window_padding_x = 20.f;
    constexpr _float k_dialogue_window_padding_y = 14.f;

    constexpr _float k_dialogue_name_box_height = 26.f;
    constexpr _float k_dialogue_body_top_margin = 8.f;
    constexpr _float k_dialogue_choice_top_margin = 10.f;

    constexpr _float k_dialogue_body_font_size = 18.f;

    constexpr _int k_dialogue_normal_max_line_count = 3;
    constexpr _int k_dialogue_choice_max_line_count = 2;
}

DialogueRunner::DialogueRunner()
{
    ResetAll();
}

bool DialogueRunner::StartSession(const DialogueSessionData& _session_data, IDialogueEventListener* _event_listener)
{
    ResetAll();

    if (!ValidateSessionData(_session_data))
    {
        session_result_.end_reason = DialogueSessionEndReason::InvalidData;
        runtime_state_.session_state = DialogueSessionState::Finished;
        has_finished_session_ = true;
        return false;
    }

    session_data_ = _session_data;
    event_listener_ = _event_listener;
    has_active_session_ = true;
    has_finished_session_ = false;

    runtime_state_.session_state = DialogueSessionState::Opening;

    EnterOpening();
    return true;
}

void DialogueRunner::AbortSession()
{
    if (!has_active_session_)
        return;

    EnterClosing(DialogueSessionEndReason::Aborted);
}

void DialogueRunner::Update(float _delta_time)
{
    if (!has_active_session_)
        return;

    if (runtime_state_.session_state != DialogueSessionState::Running)
        return;

    switch (runtime_state_.line_state)
    {
    case DialogueLineState::Typing:
        UpdateTyping(_delta_time);
        break;

    case DialogueLineState::AutoAdvancing:
        UpdateAutoAdvance(_delta_time);
        break;

    default:
        break;
    }
}

void DialogueRunner::RequestTypingComplete()
{
    if (!has_active_session_)
        return;

    if (runtime_state_.line_state != DialogueLineState::Typing)
        return;

    CompleteCurrentTyping();
    ResolvePostTypingState();
}

void DialogueRunner::RequestNext()
{
    if (!has_active_session_)
        return;

    if (runtime_state_.line_state != DialogueLineState::WaitingForNext &&
        runtime_state_.line_state != DialogueLineState::AutoAdvancing)
    {
        return;
    }

    // 현재 라인의 남은 페이지가 있으면 다음 페이지로 진행
    if (runtime_state_.current_page_index < (runtime_state_.total_page_count - 1))
    {
        ++runtime_state_.current_page_index;
        RecalculatePageRange();
        runtime_state_.line_state = DialogueLineState::Typing;
        return;
    }

    // 마지막 페이지까지 끝났으면 다음 라인으로 진행
    AdvanceToNextLine();
}

void DialogueRunner::RequestSkipSession()
{
    if (!has_active_session_)
        return;

    if (!CanSkipInCurrentState())
        return;

    BeginSkipSession();
}

void DialogueRunner::MoveChoiceUp()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    if (runtime_state_.line_state != DialogueLineState::WaitingForChoice)
        return;

    if (current_line->choices.empty())
        return;

    const int choice_count = static_cast<int>(current_line->choices.size());
    runtime_state_.selected_choice_index =
        (runtime_state_.selected_choice_index - 1 + choice_count) % choice_count;
}

void DialogueRunner::MoveChoiceDown()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    if (runtime_state_.line_state != DialogueLineState::WaitingForChoice)
        return;

    if (current_line->choices.empty())
        return;

    const int choice_count = static_cast<int>(current_line->choices.size());
    runtime_state_.selected_choice_index =
        (runtime_state_.selected_choice_index + 1) % choice_count;
}

void DialogueRunner::ConfirmChoice()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    if (runtime_state_.line_state != DialogueLineState::WaitingForChoice)
        return;

    if (current_line->choices.empty())
        return;

    const int selected_choice_index = runtime_state_.selected_choice_index;
    if (selected_choice_index < 0 || selected_choice_index >= static_cast<int>(current_line->choices.size()))
        return;

    const DialogueChoice& choice = current_line->choices[selected_choice_index];
    AddChoiceRecord(runtime_state_.current_line_index, selected_choice_index, choice);
    AdvanceToLine(choice.next_index);
}

bool DialogueRunner::IsRunning() const
{
    return has_active_session_ && runtime_state_.session_state == DialogueSessionState::Running;
}

bool DialogueRunner::IsFinished() const
{
    return has_finished_session_;
}

bool DialogueRunner::HasActiveSession() const
{
    return has_active_session_;
}

const DialogueSessionData& DialogueRunner::GetSessionData() const
{
    return session_data_;
}

const DialogueRuntimeState& DialogueRunner::GetRuntimeState() const
{
    return runtime_state_;
}

const DialogueSessionResult& DialogueRunner::GetSessionResult() const
{
    return session_result_;
}

const DialogueLine* DialogueRunner::GetCurrentLine() const
{
    if (!has_active_session_)
        return nullptr;

    if (!ValidateLineIndex(runtime_state_.current_line_index))
        return nullptr;

    return &session_data_.lines[runtime_state_.current_line_index];
}

int DialogueRunner::GetVisibleCharCount() const
{
    return runtime_state_.visible_char_count;
}

int DialogueRunner::GetSelectedChoiceIndex() const
{
    return runtime_state_.selected_choice_index;
}

void DialogueRunner::ClearFinishedState()
{
    has_finished_session_ = false;

    if (runtime_state_.session_state == DialogueSessionState::Finished)
    {
        runtime_state_.session_state = DialogueSessionState::Idle;
    }
}

void DialogueRunner::ResetAll()
{
    has_active_session_ = false;
    has_finished_session_ = false;
    session_data_ = DialogueSessionData();
    event_listener_ = nullptr;

    ResetRuntimeState();
    ResetSessionResult();
}

void DialogueRunner::ResetRuntimeState()
{
    runtime_state_ = DialogueRuntimeState();
}

void DialogueRunner::ResetSessionResult()
{
    session_result_ = DialogueSessionResult();
}

bool DialogueRunner::ValidateSessionData(const DialogueSessionData& _session_data) const
{
    if (_session_data.lines.empty())
    {
        assert(false && "DialogueSessionData.lines must not be empty.");
        return false;
    }

    const int line_count = static_cast<int>(_session_data.lines.size());

    auto is_valid_index = [line_count](int _index) -> bool
    {
        return (_index == -1) || (_index >= 0 && _index < line_count);
    };

    for (const DialogueLine& line : _session_data.lines)
    {
        if (!ValidateLine(line))
            return false;

        if (!is_valid_index(line.next_index))
        {
            assert(false && "DialogueLine.next_index is invalid.");
            return false;
        }

        for (const DialogueChoice& choice : line.choices)
        {
            if (!ValidateChoice(choice))
                return false;

            // 선택지는 분기 대상이 반드시 존재해야 한다.
            if (!is_valid_index(choice.next_index) || choice.next_index == -1)
            {
                assert(false && "DialogueChoice.next_index is invalid.");
                return false;
            }
        }
    }

    return true;
}

bool DialogueRunner::ValidateLineIndex(int _line_index) const
{
    return _line_index >= 0 && _line_index < static_cast<int>(session_data_.lines.size());
}

bool DialogueRunner::ValidateLine(const DialogueLine& _line) const
{
    switch (_line.message_type)
    {
    case DialogueMessageType::Dialogue:
    case DialogueMessageType::Narration:
    case DialogueMessageType::SystemMessage:
        if (_line.text.empty())
        {
            assert(false && "DialogueLine.text must not be empty.");
            return false;
        }
        break;

    default:
        assert(false && "Invalid DialogueMessageType.");
        return false;
    }

    for (const DialogueEvent& event : _line.events)
    {
        if (event.event_id.empty())
        {
            assert(false && "DialogueEvent.event_id must not be empty.");
            return false;
        }
    }

    return true;
}

bool DialogueRunner::ValidateChoice(const DialogueChoice& _choice) const
{
    if (_choice.text.empty())
    {
        assert(false && "DialogueChoice.text must not be empty.");
        return false;
    }

    if (_choice.next_index < 0)
    {
        assert(false && "DialogueChoice.next_index must be a valid line index.");
        return false;
    }

    return true;
}

bool DialogueRunner::CanUseTypingEffect(const DialogueLine& _line) const
{
    return _line.use_typing_effect;
}

bool DialogueRunner::CanUseAutoAdvance(const DialogueLine& _line) const
{
    if (!session_data_.settings.allow_auto_advance)
        return false;

    if (!_line.use_auto_advance)
        return false;

    // 선택지 라인에서는 자동 진행을 허용하지 않는다.
    if (!_line.choices.empty())
        return false;

    return true;
}

bool DialogueRunner::CanSkipInCurrentState() const
{
    if (runtime_state_.line_state == DialogueLineState::WaitingForChoice)
        return session_data_.settings.allow_skip_in_choice;

    return true;
}

void DialogueRunner::EnterOpening()
{
    runtime_state_.session_state = DialogueSessionState::Running;
    EnterLine(0);
}

void DialogueRunner::EnterLine(int _line_index)
{
    if (!ValidateLineIndex(_line_index))
    {
        assert(false && "Invalid line index.");
        EnterClosing(DialogueSessionEndReason::InvalidData);
        return;
    }

    runtime_state_.current_line_index = _line_index;
    runtime_state_.selected_choice_index = 0;
    runtime_state_.current_page_index = 0;
    runtime_state_.total_page_count = 1;
    runtime_state_.page_char_start = 0;
    runtime_state_.page_char_end = 0;
    runtime_state_.visible_char_count = 0;
    runtime_state_.typing_elapsed = 0.f;
    runtime_state_.auto_advance_elapsed = 0.f;
    runtime_state_.auto_advance_canceled_by_input = false;
    runtime_state_.skip_requested = false;

    AddVisitedLineRecord(_line_index);
    RecalculatePageRange();
    ResolveLineOnEnter();
}

void DialogueRunner::EnterClosing(DialogueSessionEndReason _end_reason)
{
    runtime_state_.session_state = DialogueSessionState::Closing;
    session_result_.end_reason = _end_reason;
    FinishSession();
}

void DialogueRunner::FinishSession()
{
    has_active_session_ = false;
    has_finished_session_ = true;
    runtime_state_.session_state = DialogueSessionState::Finished;
    runtime_state_.line_state = DialogueLineState::Completed;
}

void DialogueRunner::UpdateTyping(float _delta_time)
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    runtime_state_.typing_elapsed += _delta_time;

    const int page_char_count = runtime_state_.page_char_end - runtime_state_.page_char_start;

    while (runtime_state_.typing_elapsed >= k_default_typing_interval &&
        runtime_state_.visible_char_count < page_char_count)
    {
        runtime_state_.typing_elapsed -= k_default_typing_interval;
        ++runtime_state_.visible_char_count;
    }

    if (runtime_state_.visible_char_count >= page_char_count)
    {
        runtime_state_.visible_char_count = page_char_count;
        ResolvePostTypingState();
    }
}

void DialogueRunner::UpdateAutoAdvance(float _delta_time)
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    float delay = current_line->auto_advance_delay;
    if (delay <= 0.f)
    {
        delay = session_data_.settings.default_auto_advance_delay;
    }

    runtime_state_.auto_advance_elapsed += _delta_time;

    if (runtime_state_.auto_advance_elapsed >= delay)
    {
        AdvanceToNextLine();
    }
}

void DialogueRunner::ResolveLineOnEnter()
{
    ExecuteLineEvents(DialogueEventTrigger::OnLineEnter, false);

    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    if (CanUseTypingEffect(*current_line))
    {
        runtime_state_.line_state = DialogueLineState::Typing;
        return;
    }

    runtime_state_.visible_char_count = static_cast<int>(current_line->text.size());
    ResolvePostTypingState();
}

void DialogueRunner::RecalculatePageRange()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    const auto resolution = _ScreenSystem.WindowResolution();
    const _float screen_w = s_float(resolution.width);
    const _float screen_h = s_float(resolution.height);

    const _float window_w = screen_w * k_dialogue_window_width_ratio;
    const _float window_h = screen_h * k_dialogue_window_height_ratio;
    const _float window_x = (screen_w - window_w) * 0.5f;
    const _float window_y = screen_h - window_h - (screen_h * k_dialogue_window_bottom_margin_ratio);

    const _float inner_x = window_x + k_dialogue_window_padding_x;
    const _float inner_y = window_y + k_dialogue_window_padding_y;
    const _float inner_w = window_w - (k_dialogue_window_padding_x * 2.f);

    const _bool has_choices = !current_line->choices.empty();
    const _int body_max_line_count = has_choices ? k_dialogue_choice_max_line_count : k_dialogue_normal_max_line_count;

    const _float body_y = inner_y + k_dialogue_name_box_height + k_dialogue_body_top_margin;
    UNREFERENCED_PARAMETER(body_y);

    const _float body_h = k_dialogue_body_font_size * s_float(body_max_line_count) + 8.f;

    std::vector<DialoguePageRange> pages;
    DialogueTextLayouter::BuildPages(
        current_line->text,
        inner_w,
        body_h,
        k_dialogue_body_font_size,
        _DrawFunc::FONT_STYLE_REGULAR,
        pages);

    if (pages.empty())
    {
        runtime_state_.current_page_index = 0;
        runtime_state_.total_page_count = 1;
        runtime_state_.page_char_start = 0;
        runtime_state_.page_char_end = 0;
        runtime_state_.visible_char_count = 0;
        runtime_state_.typing_elapsed = 0.f;
        runtime_state_.auto_advance_elapsed = 0.f;
        return;
    }

    if (runtime_state_.current_page_index < 0)
        runtime_state_.current_page_index = 0;

    if (runtime_state_.current_page_index >= s_int(pages.size()))
        runtime_state_.current_page_index = s_int(pages.size()) - 1;

    runtime_state_.total_page_count = s_int(pages.size());
    runtime_state_.page_char_start = pages[runtime_state_.current_page_index].start_index_;
    runtime_state_.page_char_end = pages[runtime_state_.current_page_index].end_index_;

    runtime_state_.visible_char_count = 0;
    runtime_state_.typing_elapsed = 0.f;
    runtime_state_.auto_advance_elapsed = 0.f;
}

void DialogueRunner::ResolvePostTypingState()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    if (!current_line->choices.empty())
    {
        runtime_state_.line_state = DialogueLineState::WaitingForChoice;
        return;
    }

    if (CanUseAutoAdvance(*current_line))
    {
        runtime_state_.line_state = DialogueLineState::AutoAdvancing;
        runtime_state_.auto_advance_elapsed = 0.f;
        return;
    }

    runtime_state_.line_state = DialogueLineState::WaitingForNext;
}

void DialogueRunner::AdvanceToNextLine()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
    {
        EnterClosing(DialogueSessionEndReason::InvalidData);
        return;
    }

    ExecuteLineEvents(DialogueEventTrigger::OnLineExit, false);

    if (current_line->next_index < 0)
    {
        EnterClosing(DialogueSessionEndReason::Completed);
        return;
    }

    AdvanceToLine(current_line->next_index);
}

void DialogueRunner::AdvanceToLine(int _next_index)
{
    if (!ValidateLineIndex(_next_index))
    {
        assert(false && "Invalid next_index.");
        EnterClosing(DialogueSessionEndReason::InvalidData);
        return;
    }

    EnterLine(_next_index);
}

void DialogueRunner::CompleteCurrentTyping()
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    runtime_state_.visible_char_count = runtime_state_.page_char_end - runtime_state_.page_char_start;
}

void DialogueRunner::BeginSkipSession()
{
    runtime_state_.line_state = DialogueLineState::SkippingSession;
    runtime_state_.skip_requested = true;

    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
    {
        EnterClosing(DialogueSessionEndReason::InvalidData);
        return;
    }

    // 현재 라인은 이미 OnLineEnter가 실행된 상태라고 가정한다.
    // 따라서 세션 스킵 시 현재 라인의 OnLineEnter는 재실행하지 않는다.
    ExecuteLineEvents(DialogueEventTrigger::OnLineExit, true);

    int next_index = current_line->next_index;

    while (next_index >= 0)
    {
        if (!ValidateLineIndex(next_index))
        {
            assert(false && "Invalid next_index during skip.");
            EnterClosing(DialogueSessionEndReason::InvalidData);
            return;
        }

        runtime_state_.current_line_index = next_index;
        AddVisitedLineRecord(next_index);

        ExecuteLineEvents(DialogueEventTrigger::OnLineEnter, true);

        const DialogueLine* skip_line = GetCurrentLine();
        if (skip_line == nullptr)
        {
            EnterClosing(DialogueSessionEndReason::InvalidData);
            return;
        }

        ExecuteLineEvents(DialogueEventTrigger::OnLineExit, true);
        next_index = skip_line->next_index;
    }

    EnterClosing(DialogueSessionEndReason::Skipped);
}

void DialogueRunner::ExecuteLineEvents(DialogueEventTrigger _trigger, bool _is_skipping_session)
{
    const DialogueLine* current_line = GetCurrentLine();
    if (current_line == nullptr)
        return;

    for (const DialogueEvent& event : current_line->events)
    {
        if (event.trigger != _trigger)
            continue;

        ExecuteEvent(event, _is_skipping_session);
    }
}

void DialogueRunner::ExecuteEvent(const DialogueEvent& _event, bool _is_skipping_session)
{
    if (_is_skipping_session && _event.category != DialogueEventCategory::Gameplay)
        return;

    if (_event.category == DialogueEventCategory::Gameplay)
    {
        session_result_.execution_record.executed_gameplay_event_ids.push_back(_event.event_id);
    }

    if (event_listener_ != nullptr)
    {
        event_listener_->OnDialogueEvent(_event.event_id);
    }
}

void DialogueRunner::AddVisitedLineRecord(int _line_index)
{
    session_result_.execution_record.visited_line_indices.push_back(_line_index);
}

void DialogueRunner::AddChoiceRecord(int _line_index, int _choice_index, const DialogueChoice& _choice)
{
    DialogueChoiceRecord record;
    record.line_index = _line_index;
    record.choice_index = _choice_index;
    record.choice_text = _choice.text;
    record.next_index = _choice.next_index;

    session_result_.choice_records.push_back(std::move(record));
}
