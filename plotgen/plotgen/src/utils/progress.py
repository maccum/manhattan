

def progress(i, total, prefix = 'Zoom Level', suffix = 'Complete', decimals = 1, length = 50, fill = '█'):
    # https://stackoverflow.com/questions/3173320/text-progress-bar-in-the-console
    percent = ("{0:." + str(decimals) + "f}").format(100 * (i / float(total)))
    filledLength = int(length * i // total)
    bar = fill * filledLength + '-' * (length - filledLength)
    print('\r%s |%s| %s%% %s' % (prefix, bar, percent, suffix), end='\r')
    # Print New Line on Complete
    if i == total:
        print()