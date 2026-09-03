import { classifyError, errorCopy, fieldForError, formatErrorCopy, inlineError, isErrorCopy, toErrorCopy } from './errorCopy';

describe('toErrorCopy', () => {
  it('keeps an existing copy object', () => {
    const copy = errorCopy({
      what: 'Custom what',
      why: 'Custom why',
      action: 'Custom action',
    });
    expect(toErrorCopy(copy)).toEqual(copy);
  });

  it('explains network failures with a retry action', () => {
    const copy = toErrorCopy(new Error('Failed to fetch'), 'loadEvents');
    expect(copy.what).toBe("Events didn't load.");
    expect(copy.why).toMatch(/connection|server/i);
    expect(copy.action).toMatch(/try again/i);
  });

  it('turns Failed to load X into what / why / action', () => {
    const copy = toErrorCopy('Failed to load tickets. Please try again.');
    expect(copy.what).toBe("Tickets didn't load.");
    expect(copy.why).toMatch(/couldn't fetch tickets/i);
    expect(copy.action).toMatch(/try again/i);
  });

  it('explains an incorrect password with a next step', () => {
    const copy = toErrorCopy("The password doesn't match.", 'login');
    expect(copy.what).toBe("The password doesn't match.");
    expect(copy.why).toMatch(/incorrect/i);
    expect(copy.action).toMatch(/forgot password/i);
  });

  it('explains a missing account and how to continue', () => {
    const copy = toErrorCopy("This email isn't registered.", 'login');
    expect(copy.what).toBe("This email isn't registered.");
    expect(copy.why).toMatch(/no account/i);
    expect(copy.action).toMatch(/create an account/i);
  });

  it('explains an invalid email address and how to fix it', () => {
    const copy = toErrorCopy("That email address isn't valid.", 'login');
    expect(copy.what).toBe("That email address isn't valid.");
    expect(copy.why).toMatch(/complete email/i);
    expect(copy.action).toMatch(/@/i);
  });

  it('explains duplicate emails on sign-up', () => {
    const copy = toErrorCopy('User already registered', 'signup');
    expect(copy.what).toMatch(/already in use/i);
    expect(copy.action).toMatch(/log in/i);
  });

  it('hides technical database errors behind the context copy', () => {
    const copy = toErrorCopy('duplicate key value violates unique constraint', 'saveDraft');
    expect(copy.what).toBe("The draft wasn't saved.");
    expect(copy.why).not.toMatch(/duplicate key/i);
    expect(copy.action).toMatch(/try again/i);
  });

  it('does not treat urban as a ban', () => {
    const copy = toErrorCopy('Failed to load urban campus events');
    expect(copy.what).not.toMatch(/blocked/i);
  });

  it('explains certificate generation failures', () => {
    const copy = toErrorCopy('Generation failed', 'generateCertificate');
    expect(copy.what).toBe("Certificate wasn't generated.");
    expect(copy.action).toMatch(/try again/i);
  });
});

describe('formatErrorCopy', () => {
  it('joins the three parts', () => {
    expect(formatErrorCopy({
      what: 'A',
      why: 'B',
      action: 'C',
    })).toBe('A B C');
  });

  it('detects copy objects', () => {
    expect(isErrorCopy({ what: 'A', why: 'B', action: 'C' })).toBe(true);
    expect(isErrorCopy('A')).toBe(false);
  });
});

describe('inlineError', () => {
  it('keeps the message next to the field short', () => {
    expect(inlineError(toErrorCopy("The password doesn't match.", 'login'))).toBe(
      "The password doesn't match. Try again, or use Forgot password to reset it."
    );
  });
});

describe('classifyError', () => {
  it('puts credential problems on the matching field', () => {
    expect(fieldForError("The password doesn't match.")).toBe('password');
    expect(fieldForError("This email isn't registered.")).toBe('email');
    expect(fieldForError('User already registered')).toBe('email');
  });

  it('treats bans and expired sessions as blocking', () => {
    expect(classifyError('This account is banned')).toBe('banned');
    expect(classifyError('jwt expired')).toBe('session');
  });
});
