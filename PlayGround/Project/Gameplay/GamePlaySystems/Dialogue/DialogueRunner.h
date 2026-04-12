#pragma once

#include "DialogueTypes.h"
#include "DialogueTextLayouter.h"

class IDialogueEventListener;

/**
 * @brief 다이얼로그 세션의 실제 실행 로직을 담당하는 런타임 실행기.
 *
 * 책임:
 * - 세션 시작/종료
 * - 라인 진입/전이
 * - 타이핑 효과 갱신
 * - 자동 진행 갱신
 * - 선택지 처리
 * - 세션 스킵 처리
 * - 이벤트 실행 요청
 * - 세션 결과 기록 생성
 *
 * 비책임:
 * - 실제 UI 렌더링
 * - 실제 입력 디바이스 읽기
 * - 이벤트의 실제 게임플레이 처리
 */
class DialogueRunner
{
public:
    /**
     * @brief 기본 생성자.
     */
    DialogueRunner();

public:
    /**
     * @brief 새로운 다이얼로그 세션을 시작한다.
     * @param _session_data 실행할 세션 데이터.
     * @param _event_listener 이벤트 전달 대상 리스너.
     * @return 세션 시작 성공 여부.
     */
    [[nodiscard]] bool StartSession(const DialogueSessionData& _session_data, IDialogueEventListener* _event_listener);

    /**
     * @brief 현재 실행 중인 세션을 강제 중단한다.
     */
    void AbortSession();

    /**
     * @brief 현재 세션을 업데이트한다.
     * @param _delta_time 프레임 간 경과 시간(초).
     */
    void Update(float _delta_time);

public:
    /**
     * @brief 현재 라인의 타이핑을 즉시 완료한다.
     */
    void RequestTypingComplete();

    /**
     * @brief 다음 진행을 요청한다.
     */
    void RequestNext();

    /**
     * @brief 세션 스킵을 요청한다.
     */
    void RequestSkipSession();

    /**
     * @brief 선택지를 위로 이동한다.
     */
    void MoveChoiceUp();

    /**
     * @brief 선택지를 아래로 이동한다.
     */
    void MoveChoiceDown();

    /**
     * @brief 현재 선택지를 확정한다.
     */
    void ConfirmChoice();

public:
    /**
     * @brief 현재 세션이 Running 상태인지 반환한다.
     */
    [[nodiscard]] bool IsRunning() const;

    /**
     * @brief 최근 세션이 Finished 상태인지 반환한다.
     */
    [[nodiscard]] bool IsFinished() const;

    /**
     * @brief 활성 세션 보유 여부를 반환한다.
     */
    [[nodiscard]] bool HasActiveSession() const;

    /**
     * @brief 현재 보관 중인 세션 데이터를 반환한다.
     */
    [[nodiscard]] const DialogueSessionData& GetSessionData() const;

    /**
     * @brief 현재 런타임 상태를 반환한다.
     */
    [[nodiscard]] const DialogueRuntimeState& GetRuntimeState() const;

    /**
     * @brief 최근 세션 결과를 반환한다.
     */
    [[nodiscard]] const DialogueSessionResult& GetSessionResult() const;

    /**
     * @brief 현재 라인을 반환한다.
     * @return 활성 라인이 없으면 nullptr.
     */
    [[nodiscard]] const DialogueLine* GetCurrentLine() const;

    /**
     * @brief 현재 표시 중인 문자 수를 반환한다.
     */
    [[nodiscard]] int GetVisibleCharCount() const;

    /**
     * @brief 현재 선택된 선택지 인덱스를 반환한다.
     */
    [[nodiscard]] int GetSelectedChoiceIndex() const;

public:
    /**
     * @brief Finished 상태를 정리하여 Idle로 되돌린다.
     */
    void ClearFinishedState();

private:
    /**
     * @brief 내부 보관 상태를 모두 초기화한다.
     */
    void ResetAll();

    /**
     * @brief 런타임 상태만 초기화한다.
     */
    void ResetRuntimeState();

    /**
     * @brief 세션 결과만 초기화한다.
     */
    void ResetSessionResult();

private:
    /**
     * @brief 세션 데이터 전체 유효성을 검사한다.
     */
    [[nodiscard]] bool ValidateSessionData(const DialogueSessionData& _session_data) const;

    /**
     * @brief 현재 보관 중인 세션 기준 라인 인덱스 유효성을 검사한다.
     */
    [[nodiscard]] bool ValidateLineIndex(int _line_index) const;

    /**
     * @brief 라인 자체의 유효성을 검사한다.
     */
    [[nodiscard]] bool ValidateLine(const DialogueLine& _line) const;

    /**
     * @brief 선택지 데이터의 기본 유효성을 검사한다.
     */
    [[nodiscard]] bool ValidateChoice(const DialogueChoice& _choice) const;

private:
    /**
     * @brief 현재 라인에서 타이핑 효과를 사용할지 판단한다.
     */
    [[nodiscard]] bool CanUseTypingEffect(const DialogueLine& _line) const;

    /**
     * @brief 현재 라인에서 자동 진행을 사용할지 판단한다.
     */
    [[nodiscard]] bool CanUseAutoAdvance(const DialogueLine& _line) const;

    /**
     * @brief 현재 상태에서 세션 스킵이 가능한지 판단한다.
     */
    [[nodiscard]] bool CanSkipInCurrentState() const;

private:
    /**
     * @brief Opening 상태 진입 후 첫 라인으로 연결한다.
     */
    void EnterOpening();

    /**
     * @brief 지정한 라인으로 진입한다.
     */
    void EnterLine(int _line_index);

    /**
     * @brief 종료 사유를 기록하고 Closing 상태로 진입한다.
     */
    void EnterClosing(DialogueSessionEndReason _end_reason);

    /**
     * @brief 세션을 최종 종료 상태로 전환한다.
     */
    void FinishSession();

private:
    /**
     * @brief Typing 상태를 갱신한다.
     */
    void UpdateTyping(float _delta_time);

    /**
     * @brief AutoAdvancing 상태를 갱신한다.
     */
    void UpdateAutoAdvance(float _delta_time);

private:
    /**
     * @brief 라인 진입 직후 처리 로직을 수행한다.
     */
    void ResolveLineOnEnter();

    /**
     * @brief 현재 라인의 본문 영역 기준으로 페이지 범위를 다시 계산한다.
	 */
    void RecalculatePageRange();

    /**
     * @brief 타이핑 완료 후 다음 라인 상태를 결정한다.
     */
    void ResolvePostTypingState();

    /**
     * @brief 현재 라인의 next_index를 따라 다음 라인으로 진행한다.
     */
    void AdvanceToNextLine();

    /**
     * @brief 지정한 인덱스 라인으로 진행한다.
     */
    void AdvanceToLine(int _next_index);

    /**
     * @brief 현재 라인의 타이핑을 즉시 끝낸다.
     */
    void CompleteCurrentTyping();

    /**
     * @brief 세션 스킵을 실행한다.
     */
    void BeginSkipSession();

private:
    /**
     * @brief 현재 라인의 특정 트리거 이벤트들을 실행한다.
     */
    void ExecuteLineEvents(DialogueEventTrigger _trigger, bool _is_skipping_session);

    /**
     * @brief 단일 이벤트를 실행한다.
     */
    void ExecuteEvent(const DialogueEvent& _event, bool _is_skipping_session);

private:
    /**
     * @brief 방문한 라인 인덱스를 실행 기록에 추가한다.
     */
    void AddVisitedLineRecord(int _line_index);

    /**
     * @brief 선택 결과를 세션 결과에 추가한다.
     */
    void AddChoiceRecord(int _line_index, int _choice_index, const DialogueChoice& _choice);

private:
    bool has_active_session_ = false;
    bool has_finished_session_ = false;

    DialogueSessionData session_data_;
    IDialogueEventListener* event_listener_ = nullptr;

    DialogueRuntimeState runtime_state_;
    DialogueSessionResult session_result_;
};
