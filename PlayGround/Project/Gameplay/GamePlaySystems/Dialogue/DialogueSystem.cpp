#include "framework.h"
#include "DialogueSystem.h"

bool DialogueSystem::StartSession(const DialogueSessionData& _session_data, IDialogueEventListener* _event_listener)
{
    skip_hold_triggered_ = false;
    return runner_.StartSession(_session_data, _event_listener);
}

void DialogueSystem::AbortSession()
{
    skip_hold_triggered_ = false;
    runner_.AbortSession();
}

void DialogueSystem::Update(float _delta_time)
{
    runner_.Update(_delta_time);
}

void DialogueSystem::Render() const
{
    if (!runner_.IsRunning())
        return;

    view_.Render(runner_.GetSessionData(), runner_.GetRuntimeState());
}

void DialogueSystem::OnConfirmInput()
{
    const DialogueRuntimeState& runtime_state = runner_.GetRuntimeState();

    switch (runtime_state.line_state)
    {
    case DialogueLineState::Typing:
        runner_.RequestTypingComplete();
        break;

    case DialogueLineState::WaitingForNext:
        runner_.RequestNext();
        break;

    case DialogueLineState::WaitingForChoice:
        runner_.ConfirmChoice();
        break;

    case DialogueLineState::AutoAdvancing:
        runner_.RequestNext();
        break;

    default:
        break;
    }
}

void DialogueSystem::UpdateSkipHold(float _hold_seconds)
{
    static constexpr float SKIP_THRESHOLD = 2.0f;

    if (!runner_.HasActiveSession())
    {
        skip_hold_triggered_ = false;
        return;
    }

    if (_hold_seconds >= SKIP_THRESHOLD)
    {
        if (!skip_hold_triggered_)
        {
            runner_.RequestSkipSession();
            skip_hold_triggered_ = true;
        }
    }
    else
    {
        skip_hold_triggered_ = false;
    }
}

void DialogueSystem::OnSkipSessionInput()
{
    runner_.RequestSkipSession();
}

void DialogueSystem::OnChoiceUpInput()
{
    runner_.MoveChoiceUp();
}

void DialogueSystem::OnChoiceDownInput()
{
    runner_.MoveChoiceDown();
}

void DialogueSystem::OnTypingCompleteInput()
{
    runner_.RequestTypingComplete();
}

void DialogueSystem::OnNextInput()
{
    runner_.RequestNext();
}

void DialogueSystem::OnChoiceConfirmInput()
{
    runner_.ConfirmChoice();
}

bool DialogueSystem::IsRunning() const
{
    return runner_.IsRunning();
}

bool DialogueSystem::HasFinishedSession() const
{
    return runner_.IsFinished();
}

bool DialogueSystem::IsBlockingGameInput() const
{
    if (!runner_.HasActiveSession())
        return false;

    return runner_.GetSessionData().settings.block_game_input;
}

const DialogueSessionResult& DialogueSystem::GetLastSessionResult() const
{
    return runner_.GetSessionResult();
}

void DialogueSystem::ClearFinishedState()
{
    skip_hold_triggered_ = false;
    runner_.ClearFinishedState();
}